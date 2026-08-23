/**
 * Create the first owner account.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-password' node scripts/create-admin.js
 *
 * It refuses to overwrite an existing account, so it is safe to re-run.
 */
import './env.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const name = String(process.env.ADMIN_NAME || 'Site Owner');

if (!email || password.length < 12) {
  console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || undefined);
const users = db.collection('users');

await users.createIndex({ email: 1 }, { unique: true });

if (await users.findOne({ email })) {
  console.error(`An account already exists for ${email}. Nothing was changed.`);
  await client.close();
  process.exit(1);
}

const now = new Date();
await users.insertOne({
  email,
  name,
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  passwordHash: await bcrypt.hash(password, 12),
  createdAt: now,
  updatedAt: now
});

console.log(`Owner account created for ${email}.`);
console.log('Clear ADMIN_PASSWORD from your shell history before you forget.');
await client.close();
