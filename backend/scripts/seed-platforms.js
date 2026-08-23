import dotenv from 'dotenv';
dotenv.config();

import { col } from '../src/lib/db.js';

const PLATFORMS = [
  {
    name: 'DoorDash',
    providerKey: 'doordash',
    description: 'Pickup + Delivery',
    availability: 'BOTH',
    url: 'https://www.doordash.com/store/preva-kitchen-redford-43388119/',
    logo: 'https://cdn.simpleicons.org/doordash/white',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Uber Eats',
    providerKey: 'uber-eats',
    description: 'Pickup + Delivery',
    availability: 'BOTH',
    url: 'https://www.ubereats.com/search?q=Preva%20Kitchen%20Redford',
    logo: 'https://cdn.simpleicons.org/ubereats',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Toast',
    providerKey: 'toast',
    description: 'Pickup + Delivery',
    availability: 'BOTH',
    url: '/shop',
    logo: '',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Grubhub',
    providerKey: 'grubhub',
    description: 'Pickup + Delivery',
    availability: 'BOTH',
    url: 'https://www.grubhub.com/delivery/mi-redford',
    logo: '',
    isActive: true,
    sortOrder: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Call to Order',
    providerKey: 'call-to-order',
    description: 'Carryout / Pickup',
    availability: 'PICKUP',
    url: 'tel:+13132863586',
    logo: '',
    isActive: true,
    sortOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedPlatforms() {
  const collection = await col('orderingPlatforms');
  const existingCount = await collection.countDocuments();
  console.log(`Found ${existingCount} existing ordering platforms.`);

  for (const platform of PLATFORMS) {
    const existing = await collection.findOne({ providerKey: platform.providerKey });
    if (!existing) {
      await collection.insertOne(platform);
      console.log(`Inserted platform: ${platform.name}`);
    } else {
      await collection.updateOne({ _id: existing._id }, { $set: platform });
      console.log(`Updated platform: ${platform.name}`);
    }
  }

  console.log('Seeding ordering platforms complete!');
  process.exit(0);
}

seedPlatforms().catch(err => {
  console.error('Error seeding platforms:', err);
  process.exit(1);
});
