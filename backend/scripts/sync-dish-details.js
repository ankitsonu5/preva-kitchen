import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

const { col } = await import('../src/lib/db.js');
const {
  getDefaultAboutParagraphs,
  getDefaultAboutTitle,
  getDefaultFaqs,
  hasCuratedDishProfile
} = await import('../../frontend/src/lib/dish-detail-content.js');

const menuItems = await col('menuItems');
const products = await menuItems.find({ orderable: true }).toArray();
const missing = products.filter((product) => !hasCuratedDishProfile(product));

if (missing.length) {
  throw new Error(`Missing curated dish profiles: ${missing.map((product) => product.slug).join(', ')}`);
}

const now = new Date();
for (const product of products) {
  await menuItems.updateOne(
    { _id: product._id },
    {
      $set: {
        aboutTitle: getDefaultAboutTitle(product),
        aboutContent: getDefaultAboutParagraphs(product).join('\n\n'),
        faqs: getDefaultFaqs(product),
        updatedAt: now
      }
    }
  );
}

console.log(`Updated unique About content and five FAQs for ${products.length} orderable products.`);
process.exit(0);
