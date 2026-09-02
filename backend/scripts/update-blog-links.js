import './env.js';
import { MongoClient } from 'mongodb';
import { blogCanonical, rewriteLegacyBlogLinks } from '../src/lib/blog-links.js';

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);

await client.connect();

try {
  const db = client.db(process.env.MONGODB_DB || undefined);
  const content = db.collection('content');
  const posts = await content.find({ type: 'POST' }).toArray();
  const operations = posts.map((post) => ({
    updateOne: {
      filter: { _id: post._id },
      update: {
        $set: {
          body: rewriteLegacyBlogLinks(post.body || ''),
          canonicalUrl: blogCanonical(post.slug),
          updatedAt: new Date()
        }
      }
    }
  }));

  if (!operations.length) {
    console.log('No blog posts found.');
  } else {
    const result = await content.bulkWrite(operations);
    console.log(`Updated ${result.modifiedCount} of ${operations.length} blog posts.`);
  }
} finally {
  await client.close();
}
