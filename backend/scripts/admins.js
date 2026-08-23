/**
 * Who can log in to the admin?
 *
 *   node scripts/admins.js                    list every account
 *   node scripts/admins.js --reset EMAIL      set a new password for one
 *
 * There is no default login anywhere in this codebase. Accounts live in the
 * `users` collection with bcrypt-hashed passwords, which means nobody — this
 * script included — can read an existing password back. Forgotten passwords
 * get reset, not recovered.
 */
import './env.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);

try {
  await client.connect();
} catch (error) {
  console.error(`Could not reach MongoDB at ${uri.replace(/:[^:@/]+@/, ':***@')}`);
  console.error('Is mongod running?');
  process.exit(1);
}

const db = client.db(process.env.MONGODB_DB || undefined);
const users = db.collection('users');

const resetFlag = process.argv.indexOf('--reset');
const resetEmail = resetFlag > -1 ? String(process.argv[resetFlag + 1] || '').trim().toLowerCase() : '';

if (!resetEmail) {
  const rows = await users
    .find()
    .project({ email: 1, name: 1, role: 1, status: 1, lastLoginAt: 1, passwordIsDefault: 1 })
    .sort({ role: 1, email: 1 })
    .toArray();

  if (rows.length === 0) {
    console.log('\nNo admin accounts exist in this database yet.\n');
    console.log('Create the first one with:');
    console.log("  ADMIN_EMAIL=you@prevaclub.com ADMIN_PASSWORD='a-long-unique-password' npm run create-admin\n");
  } else {
    console.log(`\n${rows.length} account${rows.length === 1 ? '' : 's'} in ${uri.split('/').pop()}:\n`);
    for (const row of rows) {
      const last = row.lastLoginAt ? new Date(row.lastLoginAt).toISOString().slice(0, 16).replace('T', ' ') : 'never';
      const warn = row.passwordIsDefault ? '  << still on the default password' : '';
      console.log(`  ${row.email.padEnd(34)} ${String(row.role).padEnd(12)} ${String(row.status || 'ACTIVE').padEnd(9)} last login: ${last}${warn}`);
    }
    console.log('\nPasswords are hashed and cannot be read back. To set a new one:');
    console.log(`  node scripts/admins.js --reset ${rows[0].email}\n`);
  }
  await client.close();
  process.exit(0);
}

/* ── reset ────────────────────────────────────────────────────────────────── */

const account = await users.findOne({ email: resetEmail });
if (!account) {
  console.error(`\nNo account found for ${resetEmail}.`);
  console.error('Run without --reset to see which accounts exist.\n');
  await client.close();
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = (await rl.question(`New password for ${resetEmail} (at least 12 characters): `)).trim();
rl.close();

if (password.length < 12) {
  console.error('\nToo short. Nothing was changed.\n');
  await client.close();
  process.exit(1);
}

await users.updateOne(
  { _id: account._id },
  {
    $set: { passwordHash: await bcrypt.hash(password, 12), status: 'ACTIVE', updatedAt: new Date() },
    $unset: { passwordIsDefault: '' }
  }
);

console.log(`\nPassword updated for ${resetEmail}. The account is active.\n`);
await client.close();
