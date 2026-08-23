/**
 * Seed the shop with a small, realistic starting menu and the settings the
 * ordering flow needs. Safe to re-run: everything upserts by slug or key.
 */
import './env.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || undefined);

const SETTINGS = {
  siteTitle: 'Preva Nightclub & Restaurant',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  shopOrderingEnabled: true,
  shopPickupEnabled: true,
  shopDeliveryEnabled: true,
  shopTaxRate: 0.06,
  shopDeliveryFeeCents: 499,
  shopFreeDeliveryOverCents: 5000,
  shopMinOrderCents: 1500,
  shopPickupMinutes: 25,
  shopDeliveryMinutes: 45,
  shopTipPresets: [15, 18, 20],
  shopClosedMessage: 'Online ordering is closed right now. The kitchen reopens at 11am.'
};

const MENU = [
  {
    name: 'Preva Wings', slug: 'preva-wings', category: 'Wings', priceCents: 1500,
    description: 'Crispy wings tossed to order in your choice of house flavour.',
    servings: '12 pieces', featured: true, badge: 'Most ordered',
    optionGroups: [{
      id: 'flavour', label: 'Flavour', type: 'radio', required: true, maxPick: 1,
      options: [
        { id: 'lemon-pepper', label: 'Lemon Pepper', priceCents: 0, available: true },
        { id: 'buffalo', label: 'House Buffalo', priceCents: 0, available: true },
        { id: 'honey-gold', label: 'Honey Gold', priceCents: 0, available: true },
        { id: 'garlic-parm', label: 'Garlic Parmesan', priceCents: 0, available: true },
        { id: 'dry-rub', label: 'Preva Dry Rub', priceCents: 0, available: true }
      ]
    }, {
      id: 'dip', label: 'Add a dip', type: 'check', required: false, maxPick: 2,
      options: [
        { id: 'ranch', label: 'Ranch', priceCents: 100, available: true },
        { id: 'blue-cheese', label: 'Blue cheese', priceCents: 100, available: true }
      ]
    }]
  },
  {
    name: 'Double Smash Burger', slug: 'double-smash-burger', category: 'Burgers', priceCents: 999,
    description: 'Two smash patties, American cheese, thousand island, served with fries.',
    servings: '1', badge: 'Best value',
    optionGroups: [{
      id: 'deluxe', label: 'Make it deluxe', type: 'check', required: false, maxPick: 1,
      options: [{ id: 'deluxe-yes', label: 'Lettuce, onion, tomato & turkey bacon', priceCents: 299, available: true }]
    }]
  },
  { name: 'Chicken Quesadilla', slug: 'chicken-quesadilla', category: 'Quesadillas', priceCents: 1600, description: 'Grilled chicken, melted cheese, peppers and onions.', servings: '1' },
  { name: 'Steak Quesadilla', slug: 'steak-quesadilla', category: 'Quesadillas', priceCents: 1700, description: 'Grilled steak, melted cheese, peppers and onions.', servings: '1' },
  { name: 'Shrimp Tacos', slug: 'shrimp-tacos', category: 'Tacos', priceCents: 1700, description: 'Three seasoned shrimp tacos with slaw and house sauce.', servings: '3 tacos' },
  { name: 'Loaded Fries', slug: 'loaded-fries', category: 'Sides', priceCents: 900, description: 'Cheese, bacon and scallion over seasoned fries.', servings: '2' },
  { name: 'Mac & Cheese', slug: 'mac-and-cheese', category: 'Sides', priceCents: 800, description: 'Five-cheese baked macaroni.', servings: '2' }
];

const settings = db.collection('setting');
for (const [key, value] of Object.entries(SETTINGS)) {
  await settings.updateOne(
    { key },
    { $set: { key, value, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

const menuItems = db.collection('menuItems');
await menuItems.createIndex({ slug: 1 }, { unique: true, sparse: true });

let index = 0;
for (const item of MENU) {
  const now = new Date();
  await menuItems.updateOne(
    { slug: item.slug },
    {
      $set: {
        ...item,
        price: `$${(item.priceCents / 100).toFixed(2)}`,
        available: true,
        orderable: true,
        featured: Boolean(item.featured),
        optionGroups: item.optionGroups || [],
        tags: [],
        sortOrder: index++,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );
}

console.log(`Seeded ${MENU.length} menu items and ${Object.keys(SETTINGS).length} settings.`);
await client.close();
