import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { col } from '../src/lib/db.js';

async function main() {
  const orders = await col('order');
  const res = await orders.updateOne({ orderNumber: 18 }, { $set: { status: 'READY', updatedAt: new Date() } });
  console.log('Order #18 updated to READY:', res.modifiedCount);
  process.exit(0);
}
main().catch(console.error);
