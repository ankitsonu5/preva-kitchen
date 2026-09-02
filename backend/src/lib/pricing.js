import { col, asObjectId } from './db.js';
import { parseMoney, taxOn, cleanText } from './sanitize.js';
import { badRequest } from '../router.js';

/**
 * This module decides what anybody is charged.
 *
 * The browser sends item ids, quantities and chosen option ids. It never sends
 * a price. Every amount is looked up from the database and recomputed here, so
 * a customer who edits the payload in DevTools changes what they are *asking
 * for* and nothing else.
 */

export const FULFILMENT = ['PICKUP', 'DELIVERY'];

/** Prices stored as "$18.00" strings are read as cents; priceCents wins if set. */
export function itemPriceCents(item) {
  if (Number.isFinite(item?.priceCents)) return item.priceCents;
  return parseMoney(item?.price);
}

export async function shopSettings() {
  const settings = await col('setting');
  const rows = await settings.find().toArray();
  const flat = {};
  for (const row of rows) flat[row.key] = row.value;

  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  return {
    taxRate: num(flat.shopTaxRate, 0.06), // Michigan sales tax
    deliveryFeeCents: num(flat.shopDeliveryFeeCents, 499),
    freeDeliveryOverCents: num(flat.shopFreeDeliveryOverCents, 5000),
    minOrderCents: num(flat.shopMinOrderCents, 1500),
    pickupMinutes: num(flat.shopPickupMinutes, 25),
    deliveryMinutes: num(flat.shopDeliveryMinutes, 45),
    pickupEnabled: flat.shopPickupEnabled !== false,
    deliveryEnabled: flat.shopDeliveryEnabled !== false,
    orderingEnabled: flat.shopOrderingEnabled !== false,
    closedMessage: cleanText(flat.shopClosedMessage, 300) || 'Online ordering is closed right now.'
  };
}

/**
 * @param {{ fulfilment:string, lines:Array }} input
 * @returns priced order with every amount in integer cents
 */
export async function priceOrder(input) {
  const settings = await shopSettings();

  if (!settings.orderingEnabled) throw badRequest(settings.closedMessage);

  const fulfilment = FULFILMENT.includes(input?.fulfilment) ? input.fulfilment : 'PICKUP';
  if (fulfilment === 'PICKUP' && !settings.pickupEnabled) throw badRequest('Pickup is not available right now.');
  if (fulfilment === 'DELIVERY' && !settings.deliveryEnabled) throw badRequest('Delivery is not available right now.');

  const rawLines = Array.isArray(input?.lines) ? input.lines : [];
  if (rawLines.length === 0) throw badRequest('Your cart is empty.');
  if (rawLines.length > 60) throw badRequest('Your cart contains too many separate items.');

  const ids = rawLines.map((line) => asObjectId(line?.itemId));
  if (ids.some((id) => !id)) throw badRequest('Your cart contains an invalid item.');

  const menuItems = await col('menuItems');
  const found = await menuItems.find({ _id: { $in: ids } }).toArray();
  const byId = new Map(found.map((item) => [item._id.toString(), item]));

  const lines = [];
  let subtotalCents = 0;

  for (const raw of rawLines) {
    const item = byId.get(String(raw.itemId));
    if (!item) throw badRequest('One of the items in your cart is no longer on the menu.');
    if (item.available === false) throw badRequest(`${item.name} has just sold out.`);
    if (item.orderable !== true) throw badRequest(`${item.name} is not available for online ordering.`);

    const qty = Number(raw.qty);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 30) {
      throw badRequest(`Choose a quantity between 1 and 30 for ${item.name}.`);
    }

    // Options are looked up on the item, never trusted from the payload.
    const chosen = [];
    let optionCents = 0;
    const rawOptionIds = Array.isArray(raw.optionIds) ? raw.optionIds : [];
    if (rawOptionIds.length > 30) throw badRequest(`Too many options were selected for ${item.name}.`);
    const wanted = new Set(rawOptionIds.map(String));
    const matched = new Set();

    for (const group of item.optionGroups || []) {
      const picked = (group.options || []).filter((option) => wanted.has(String(option.id)));

      if (group.required && picked.length === 0) {
        throw badRequest(`Choose a ${String(group.label || 'option').toLowerCase()} for ${item.name}.`);
      }
      if (group.maxPick > 0 && picked.length > group.maxPick) {
        throw badRequest(`You can pick at most ${group.maxPick} for ${group.label}.`);
      }
      if (group.type === 'radio' && picked.length > 1) {
        throw badRequest(`Only one ${String(group.label || 'option').toLowerCase()} can be chosen for ${item.name}.`);
      }

      for (const option of picked) {
        if (option.available === false) throw badRequest(`${option.label} is not available right now.`);
        const priceCents = Number(option.priceCents) || 0;
        if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
          throw badRequest(`${item.name} has an invalid option price. Please contact the restaurant.`);
        }
        optionCents += priceCents;
        chosen.push(option.label);
        matched.add(String(option.id));
      }
    }

    if (matched.size !== wanted.size) {
      throw badRequest(`One of the selected options for ${item.name} is invalid or unavailable.`);
    }

    const basePriceCents = itemPriceCents(item);
    if (!Number.isSafeInteger(basePriceCents) || basePriceCents < 0) {
      throw badRequest(`${item.name} has an invalid price. Please contact the restaurant.`);
    }
    const unitCents = basePriceCents + optionCents;
    subtotalCents += unitCents * qty;

    lines.push({
      itemId: item._id.toString(),
      name: item.name,
      qty,
      unitCents,
      options: chosen.join(', '),
      note: cleanText(raw.note, 200)
    });
  }

  if (subtotalCents < settings.minOrderCents) {
    throw badRequest(`Orders start at $${(settings.minOrderCents / 100).toFixed(2)}.`);
  }

  const deliveryCents =
    fulfilment === 'DELIVERY' && subtotalCents < settings.freeDeliveryOverCents ? settings.deliveryFeeCents : 0;

  const taxCents = taxOn(subtotalCents, settings.taxRate);

  // Online orders do not collect gratuity. Keep zero-valued fields in the
  // priced result for backwards-compatible order records and exports.
  const tipPercent = 0;
  const tipCents = 0;

  return {
    settings,
    fulfilment,
    lines,
    subtotalCents,
    deliveryCents,
    taxCents,
    tipPercent,
    tipCents,
    totalCents: subtotalCents + deliveryCents + taxCents + tipCents
  };
}

/** When the kitchen should have it ready. */
export function readyAt(settings, fulfilment) {
  const minutes = fulfilment === 'DELIVERY' ? settings.deliveryMinutes : settings.pickupMinutes;
  return new Date(Date.now() + minutes * 60 * 1000);
}
