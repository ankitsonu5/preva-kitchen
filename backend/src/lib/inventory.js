import { asObjectId } from './db.js';
import { badRequest } from '../router.js';

/**
 * Deducts stock for every tracked line item on an order, atomically per item
 * so two orders racing for the last unit can never both succeed. Items with
 * `trackInventory` off are skipped entirely — untracked items stay unlimited.
 *
 * Called once an order is genuinely committed (RECEIVED), never at checkout
 * time, so an abandoned Stripe session never permanently locks stock that
 * was never actually sold.
 */
export async function reserveStock(menuItems, lines) {
  const applied = [];
  try {
    for (const line of lines) {
      const id = asObjectId(line.itemId);
      if (!id) continue;
      const qty = Number(line.qty) || 0;
      if (qty <= 0) continue;

      const item = await menuItems.findOne({ _id: id });
      if (!item?.trackInventory) continue;

      const result = await menuItems.updateOne(
        { _id: id, trackInventory: true, stockCount: { $gte: qty } },
        { $inc: { stockCount: -qty } }
      );
      if (result.modifiedCount !== 1) {
        throw badRequest(`${item.name} only has limited stock left. Please adjust the quantity.`);
      }
      applied.push({ id, qty });

      const after = await menuItems.findOne({ _id: id });
      if (after && after.stockCount <= 0 && after.available !== false) {
        await menuItems.updateOne({ _id: id }, { $set: { available: false } });
      }
    }
  } catch (error) {
    for (const entry of applied) {
      await menuItems.updateOne({ _id: entry.id }, { $inc: { stockCount: entry.qty } });
    }
    throw error;
  }
}

/** Gives back stock for a cancelled/refunded order. Best-effort — never blocks the status change it's called from. */
export async function releaseStock(menuItems, lines) {
  for (const line of lines || []) {
    const id = asObjectId(line.itemId);
    if (!id) continue;
    const qty = Number(line.qty) || 0;
    if (qty <= 0) continue;

    const item = await menuItems.findOne({ _id: id, trackInventory: true });
    if (!item) continue;
    await menuItems.updateOne({ _id: id }, { $inc: { stockCount: qty } });
  }
}

/**
 * Reserve an order's stock once and record the reservation on the order.
 * The marker is what lets payment retries, webhook retries, cancellation and
 * refunds share one idempotent inventory lifecycle instead of decrementing or
 * restoring the same units more than once.
 */
export async function reserveOrderStock({ orders, menuItems, order, now = new Date() }) {
  if (order?.inventory?.status === 'RESERVED') return false;
  if (!order?._id) throw badRequest('Cannot reserve stock for an unsaved order.');

  await reserveStock(menuItems, order.lines || []);
  try {
    await orders.updateOne(
      { _id: order._id },
      {
        $set: {
          'inventory.status': 'RESERVED',
          'inventory.reservedAt': now,
          'inventory.releasedAt': null,
          updatedAt: now
        }
      }
    );
  } catch (error) {
    // If the order marker cannot be saved, undo the physical decrement so the
    // database never contains an untraceable reservation.
    await releaseStock(menuItems, order.lines || []);
    throw error;
  }
  return true;
}

/** Claim and release an order reservation exactly once. */
export async function releaseOrderStock({ orders, menuItems, order, reason = 'released', now = new Date() }) {
  if (order?.inventory?.status !== 'RESERVED') return false;

  const claimed = await orders.updateOne(
    { _id: order._id, 'inventory.status': 'RESERVED' },
    {
      $set: {
        'inventory.status': 'RELEASING',
        'inventory.releaseReason': String(reason || 'released').slice(0, 80),
        updatedAt: now
      }
    }
  );
  if (claimed.modifiedCount !== 1) return false;

  try {
    await releaseStock(menuItems, order.lines || []);
    await orders.updateOne(
      { _id: order._id, 'inventory.status': 'RELEASING' },
      { $set: { 'inventory.status': 'RELEASED', 'inventory.releasedAt': now, updatedAt: now } }
    );
    return true;
  } catch (error) {
    await orders.updateOne(
      { _id: order._id, 'inventory.status': 'RELEASING' },
      {
        $set: {
          'inventory.status': 'RELEASE_FAILED',
          'inventory.lastError': String(error?.message || error).slice(0, 300),
          updatedAt: now
        }
      }
    );
    throw error;
  }
}
