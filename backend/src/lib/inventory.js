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
