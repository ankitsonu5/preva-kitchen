/**
 * Create or update one required admin without storing credentials in source.
 *
 * ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_ROLE=SUPER_ADMIN npm run ensure-admin
 */
import './env.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER'];
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const role = String(process.env.ADMIN_ROLE || 'ADMIN').trim().toUpperCase();
const name = String(process.env.ADMIN_NAME || email.split('@')[0] || 'Preva Admin').trim();

if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid ADMIN_EMAIL is required.');
if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
if (!allowedRoles.includes(role)) throw new Error(`ADMIN_ROLE must be one of: ${allowedRoles.join(', ')}.`);

const uri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
if (!uri) throw new Error('MONGODB_URI is required.');

const client = new MongoClient(uri);
await client.connect();

try {
  const users = client.db(process.env.MONGODB_DB || undefined).collection('users');
  await users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
  const now = new Date();
  const result = await users.updateOne(
    { email },
    {
      $set: {
        name,
        role,
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash(password, 12),
        passwordIsDefault: false,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  console.log(`${result.upsertedCount ? 'Created' : 'Updated'} ${email} as ${role}. Password was not printed.`);
} finally {
  await client.close();
}
