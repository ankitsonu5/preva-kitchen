import { badRequest } from '../router.js';
import { notifyCustomerOrderStatus } from './email.js';
import { col } from './db.js';
import { releaseOrderStock } from './inventory.js';
import { notifyKdsChange } from './events.js';

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'RECEIVED',
  'PREPARING',
  'READY',
  'ON_THE_WAY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
];

export const KDS_ACTIVE_STATUSES = ['PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY'];

export function allowedOrderTransitions(order = {}) {
  return {
    PENDING: ['CANCELLED'],
    PAID: ['PREPARING', 'CANCELLED'],
    RECEIVED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'RECEIVED'],
    READY: order.fulfilment === 'DELIVERY'
      ? ['ON_THE_WAY', 'PREPARING']
      : ['COMPLETED', 'PREPARING'],
    ON_THE_WAY: ['DELIVERED', 'READY'],
    DELIVERED: ['COMPLETED', 'ON_THE_WAY'],
    COMPLETED: order.fulfilment === 'DELIVERY' ? ['ON_THE_WAY'] : ['READY']
  };
}

export function canTransitionOrder(order, targetStatus) {
  const target = String(targetStatus || '').trim().toUpperCase();
  return (allowedOrderTransitions(order)[order?.status] || []).includes(target);
}

function stageTimestamps(order, status, now) {
  if (status === 'RECEIVED') return { receivedAt: order.receivedAt || now };
  if (status === 'PREPARING') return { preparingAt: now };
  if (status === 'READY') return { actualReadyAt: now };
  if (status === 'ON_THE_WAY') return { outForDeliveryAt: now };
  if (status === 'DELIVERED') return { deliveredAt: now, completedAt: now };
  if (status === 'COMPLETED') return { completedAt: now };
  if (status === 'CANCELLED') return { cancelledAt: now };
  return {};
}

/**
 * Apply one validated order transition.
 *
 * Both KDS entry points call this service so their state rules, audit history,
 * timestamps, and customer notifications cannot drift apart.
 */
export async function transitionOrderStatus({ orders, order, targetStatus, actor, reason = '', now = new Date() }) {
  const status = String(targetStatus || '').trim().toUpperCase();
  if (!ORDER_STATUSES.includes(status)) throw badRequest('That is not a valid order status.');
  if (!canTransitionOrder(order, status)) {
    throw badRequest(`Order #${order.orderNumber} cannot move from ${order.status} to ${status}.`);
  }

  const statusHistory = [
    ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
    { status, at: now, by: actor || 'system' }
  ].slice(-30);

  const update = {
    status,
    statusHistory,
    statusChangedAt: now,
    updatedAt: now,
    ...stageTimestamps(order, status, now)
  };
  const cleanReason = String(reason || '').trim().slice(0, 300);
  if (status === 'CANCELLED' && cleanReason) update.cancellationReason = cleanReason;

  await orders.updateOne({ _id: order._id }, { $set: update });
  const updatedOrder = { ...order, ...update };
  notifyKdsChange();

  // Only a RECEIVED-or-later order ever had stock reserved (checkout never
  // reserves for a still-PENDING/unpaid order), so only give it back here.
  if (status === 'CANCELLED' && order.status !== 'PENDING') {
    try {
      await releaseOrderStock({
        orders,
        menuItems: await col('menuItems'),
        order,
        reason: 'order-cancelled',
        now
      });
    } catch (error) {
      console.error('[inventory] stock release error:', error.message);
    }
  }

  // Email delivery must never roll back a kitchen action.
  try {
    await notifyCustomerOrderStatus(updatedOrder, status);
  } catch (error) {
    console.error('[email] customer status notify error:', error.message);
  }

  return updatedOrder;
}

/** Persist one line's preparation checkbox and retain a compact audit trail. */
export async function setOrderItemChecked({ orders, order, lineIndex, checked, actor, now = new Date() }) {
  const index = Number(lineIndex);
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  if (!Number.isInteger(index) || index < 0 || index >= lines.length) {
    throw badRequest('That kitchen item does not exist on this order.');
  }
  if (typeof checked !== 'boolean') throw badRequest('Item checked state must be true or false.');

  const by = actor || 'kitchen-display';
  const existingStates = Array.isArray(order.kdsItemStates) ? order.kdsItemStates : [];
  const state = { lineIndex: index, checked, at: now, by };
  const kdsItemStates = [
    ...existingStates.filter((entry) => Number(entry?.lineIndex) !== index),
    state
  ].sort((left, right) => Number(left.lineIndex) - Number(right.lineIndex));
  const kdsItemHistory = [
    ...(Array.isArray(order.kdsItemHistory) ? order.kdsItemHistory : []),
    state
  ].slice(-100);
  const update = { kdsItemStates, kdsItemHistory, updatedAt: now };

  await orders.updateOne({ _id: order._id }, { $set: update });
  notifyKdsChange();
  return { ...order, ...update };
}

export async function assignOrderTicket({ orders, order, station, assignee, actor, now = new Date() }) {
  const cleanStation = String(station ?? order.kdsAssignment?.station ?? '').trim().slice(0, 40);
  const cleanAssignee = String(assignee ?? order.kdsAssignment?.assignee ?? '').trim().slice(0, 80);
  if (!cleanStation && !cleanAssignee) throw badRequest('Choose a station or cook for this ticket.');

  const assignment = {
    station: cleanStation || 'Expo',
    assignee: cleanAssignee,
    at: now,
    by: actor || 'kitchen-display'
  };
  const kdsAssignmentHistory = [
    ...(Array.isArray(order.kdsAssignmentHistory) ? order.kdsAssignmentHistory : []),
    assignment
  ].slice(-50);
  const update = { kdsAssignment: assignment, kdsAssignmentHistory, updatedAt: now };
  await orders.updateOne({ _id: order._id }, { $set: update });
  notifyKdsChange();
  return { ...order, ...update };
}
