/**
 * Creates the first admin account so you can get in straight away.
 *
 *   npm run first-admin
 *
 * Three guards keep account creation explicit and safe:
 *
 *   1. It refuses to run if any account already exists, so it can never
 *      overwrite a real one or quietly re-enable an account you disabled.
 *   2. It requires ADMIN_EMAIL and ADMIN_PASSWORD; there are no repository
 *      defaults that could become known credentials.
 *   3. It refuses to run when NODE_ENV=production. On the live server you
 *      create accounts with `npm run create-admin` and a password you chose.
 *
 */
import './env.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const EMAIL = String(process.env.ADMIN_EMAIL || '').trim();
const PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const NAME = process.env.ADMIN_NAME || 'Preva Admin';

if (!EMAIL || PASSWORD.length < 12) {
  console.error('\nADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are required.\n');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('\nThis script is for local setup only.');
  console.error('On a live server use:');
  console.error("  ADMIN_EMAIL=you@prevakitchen.com ADMIN_PASSWORD='...' npm run create-admin\n");
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);

try {
  await client.connect();
} catch {
  console.error(`\nCould not reach MongoDB at ${uri.replace(/:[^:@/]+@/, ':***@')}`);
  console.error('Start mongod, then run this again.\n');
  process.exit(1);
}

const db = client.db(process.env.MONGODB_DB || undefined);
const users = db.collection('users');
await users.createIndex({ email: 1 }, { unique: true });

const existing = await users.countDocuments();
if (existing > 0) {
  console.log(`\nThis database already has ${existing} account${existing === 1 ? '' : 's'}. Nothing was changed.`);
  console.log('Run `npm run admins` to see them, or reset one with:');
  console.log('  node scripts/admins.js --reset EMAIL\n');
  await client.close();
  process.exit(0);
}

const now = new Date();
await users.insertOne({
  email: EMAIL.toLowerCase(),
  name: NAME,
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  passwordHash: await bcrypt.hash(PASSWORD, 12),
  passwordIsDefault: false,
  createdAt: now,
  updatedAt: now
});

const line = '─'.repeat(52);
console.log(`\n${line}`);
console.log('  Admin account created');
console.log(line);
console.log(`  URL       http://localhost:${process.env.PORT || 3000}/admin`);
console.log(`  Email     ${EMAIL}`);
console.log(line);
console.log('  Password was read from ADMIN_PASSWORD and was not printed.');
console.log(`${line}\n`);

await client.close();
