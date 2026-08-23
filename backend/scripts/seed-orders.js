import dotenv from 'dotenv';
dotenv.config();

import { col } from '../src/lib/db.js';

async function seedOrders() {
  const orders = await col('order');
  const now = new Date();

  const sampleOrders = [
    {
      orderNumber: 1001,
      status: 'PREPARING',
      fulfilment: 'PICKUP',
      customer: {
        name: 'Jordan Hayes',
        phone: '313-555-0182',
        email: 'jordan.hayes@example.com',
        note: 'Extra sauce on the side please'
      },
      lines: [
        { itemId: '6699a0000000000000000001', name: 'Lavish Lamb Tower', qty: 1, unitCents: 2750, options: 'Medium Rare' },
        { itemId: '6699a0000000000000000002', name: 'Preva Seasoned Fries', qty: 2, unitCents: 650 }
      ],
      subtotalCents: 4050,
      deliveryCents: 0,
      taxCents: 243,
      tipCents: 600,
      totalCents: 4893,
      readyAt: new Date(Date.now() + 20 * 60 * 1000),
      payment: { provider: 'stripe', status: 'PAID', mode: 'live', amountCents: 4893, currency: 'usd', paidAt: now },
      statusHistory: [
        { status: 'PAID', at: new Date(Date.now() - 10 * 60 * 1000), by: 'stripe' },
        { status: 'PREPARING', at: new Date(Date.now() - 5 * 60 * 1000), by: 'kitchen' }
      ],
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      updatedAt: now
    },
    {
      orderNumber: 1002,
      status: 'READY',
      fulfilment: 'DELIVERY',
      customer: {
        name: 'Samantha Wright',
        phone: '313-555-0199',
        email: 'samantha.w@example.com',
        address: '14200 Telegraph Rd, Redford, MI',
        postcode: '48239',
        note: 'Please leave at front door'
      },
      lines: [
        { itemId: '6699a0000000000000000003', name: 'Seared Steak Bites', qty: 2, unitCents: 2198 },
        { itemId: '6699a0000000000000000004', name: 'Preva Wings (Honey Hot)', qty: 1, unitCents: 1650 }
      ],
      subtotalCents: 6046,
      deliveryCents: 499,
      taxCents: 363,
      tipCents: 900,
      totalCents: 7808,
      readyAt: new Date(Date.now() + 5 * 60 * 1000),
      payment: { provider: 'stripe', status: 'PAID', mode: 'live', amountCents: 7808, currency: 'usd', paidAt: now },
      statusHistory: [
        { status: 'PAID', at: new Date(Date.now() - 25 * 60 * 1000), by: 'stripe' },
        { status: 'PREPARING', at: new Date(Date.now() - 20 * 60 * 1000), by: 'kitchen' },
        { status: 'READY', at: new Date(Date.now() - 2 * 60 * 1000), by: 'kitchen' }
      ],
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
      updatedAt: now
    },
    {
      orderNumber: 1003,
      status: 'PAID',
      fulfilment: 'PICKUP',
      customer: {
        name: 'Devon Miller',
        phone: '313-555-0144',
        email: 'devon.miller@example.com'
      },
      lines: [
        { itemId: '6699a0000000000000000005', name: 'Lobster Bites', qty: 1, unitCents: 2798 }
      ],
      subtotalCents: 2798,
      deliveryCents: 0,
      taxCents: 168,
      tipCents: 400,
      totalCents: 3366,
      readyAt: new Date(Date.now() + 25 * 60 * 1000),
      payment: { provider: 'stripe', status: 'PAID', mode: 'live', amountCents: 3366, currency: 'usd', paidAt: now },
      statusHistory: [
        { status: 'PAID', at: new Date(Date.now() - 2 * 60 * 1000), by: 'stripe' }
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
      updatedAt: now
    },
    {
      orderNumber: 1004,
      status: 'COMPLETED',
      fulfilment: 'PICKUP',
      customer: {
        name: 'Ashley Coleman',
        phone: '313-555-0167',
        email: 'ashley.c@example.com'
      },
      lines: [
        { itemId: '6699a0000000000000000006', name: 'Rasta Pasta with Shrimp', qty: 1, unitCents: 2450 }
      ],
      subtotalCents: 2450,
      deliveryCents: 0,
      taxCents: 147,
      tipCents: 350,
      totalCents: 2947,
      payment: { provider: 'stripe', status: 'PAID', mode: 'live', amountCents: 2947, currency: 'usd', paidAt: now },
      statusHistory: [
        { status: 'PAID', at: new Date(Date.now() - 90 * 60 * 1000), by: 'stripe' },
        { status: 'COMPLETED', at: new Date(Date.now() - 40 * 60 * 1000), by: 'staff' }
      ],
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      updatedAt: now
    }
  ];

  for (const ord of sampleOrders) {
    await orders.updateOne({ orderNumber: ord.orderNumber }, { $set: ord }, { upsert: true });
    console.log(`✓ Order #${ord.orderNumber} (${ord.customer.name} - ${ord.status}) synced.`);
  }

  const count = await orders.countDocuments();
  console.log(`Total orders in database: ${count}`);
  process.exit(0);
}

seedOrders().catch((err) => {
  console.error('Failed to seed orders:', err);
  process.exit(1);
});
