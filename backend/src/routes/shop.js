import { col, serialize, asObjectId } from '../lib/db.js';
import { cleanText, formatMoney } from '../lib/sanitize.js';
import { shopSettings, itemPriceCents } from '../lib/pricing.js';
import { get, notFound } from '../router.js';
import { getKitchenOperatingStatus } from '../lib/operatingHours.js';


get('/shop/kitchen-status', async () => {
  return getKitchenOperatingStatus();
});

/* ══════════════════════════════════════════════════════════════════════════
   Catalogue
   ─────────────────────────────────────────────────────────────────────────
   The shop sells the same menuItems the kitchen already manages in the admin.
   An item becomes buyable by ticking "orderable" — there is no second product
   table to keep in step with the menu.
   ══════════════════════════════════════════════════════════════════════════ */

function toProduct(item) {
  const out = serialize(item);
  return {
    id: out.id,
    slug: out.slug || out.id,
    name: out.name,
    description: out.description || '',
    aboutTitle: out.aboutTitle || '',
    aboutContent: out.aboutContent || '',
    priceCents: itemPriceCents(item),
    price: formatMoney(itemPriceCents(item)),
    image: out.image || '',
    category: out.category || 'Others',
    available: out.available !== false,
    featured: Boolean(out.featured),
    badge: out.badge || '',
    uberEatsUrl: out.uberEatsUrl || '',
    doorDashUrl: out.doorDashUrl || '',
    grubhubUrl: out.grubhubUrl || '',
    tags: out.tags || [],
    allergens: out.allergens || [],
    pairings: out.pairings || [],
    faqs: out.faqs || [],
    servings: out.servings || '',
    calories: out.calories || null,
    ...(item.trackInventory ? { stockRemaining: Number.isFinite(item.stockCount) ? item.stockCount : 0 } : {}),
    optionGroups: (out.optionGroups || []).map((group) => ({
      id: group.id,
      label: group.label,
      type: group.type === 'check' ? 'check' : 'radio',
      required: Boolean(group.required),
      maxPick: Number(group.maxPick) || 0,
      options: (group.options || [])
        .filter((option) => option.available !== false)
        .map((option) => ({
          id: option.id,
          label: option.label,
          priceCents: Number(option.priceCents) || 0
        }))
    }))
  };
}

get('/shop/settings', async () => shopSettings());

get('/shop/products', async ({ query }) => {
  const menuItems = await col('menuItems');
  const filter = { orderable: true };
  if (query.category) filter.category = cleanText(query.category, 80);
  if (query.featured === 'true') filter.featured = true;

  const rows = await menuItems.find(filter).sort({ category: 1, sortOrder: 1, name: 1 }).toArray();
  return rows.map(toProduct);
});

get('/shop/categories', async () => {
  const menuItems = await col('menuItems');
  const rows = await menuItems.aggregate([
    { $match: { orderable: true, available: { $ne: false } } },
    { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  return rows.map((row) => ({ name: typeof row._id === 'object' ? String(row._id || 'Others') : (row._id || 'Others'), count: Number(row.count) || 1, image: String(row.image || '') }));
});

get('/shop/products/:slug', async ({ params }) => {
  const menuItems = await col('menuItems');
  const byId = asObjectId(params.slug);
  const row = await menuItems.findOne(byId ? { _id: byId } : { slug: params.slug });
  if (!row || row.orderable === false) throw notFound('That item is not on the menu.');

  const related = await menuItems
    .find({ orderable: true, category: row.category, _id: { $ne: row._id } })
    .sort({ sortOrder: 1 })
    .limit(4)
    .toArray();

  return { product: toProduct(row), related: related.map(toProduct) };
});
