import './env.js';
import { MongoClient } from 'mongodb';

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
const isLocalHost = (hostname = '') => ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const origins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const requiredOrigins = ['https://prevakitchen.com', 'https://www.prevakitchen.com'];
add('NODE_ENV', process.env.NODE_ENV === 'production', process.env.NODE_ENV || '<unset>');
add('CORS live origins', requiredOrigins.every((origin) => origins.includes(origin)), origins.join(', ') || '<unset>');
add('CORS has no localhost', origins.every((origin) => !isLocalHost(safeUrl(origin)?.hostname)), origins.join(', ') || '<unset>');

const siteUrl = safeUrl(String(process.env.NEXT_PUBLIC_SITE_URL || ''));
add(
  'Public site URL',
  siteUrl?.protocol === 'https:' && !isLocalHost(siteUrl.hostname),
  siteUrl?.origin || '<unset/invalid>'
);

const jwtSecret = String(process.env.JWT_SECRET || '').trim();
add(
  'JWT secret',
  jwtSecret.length >= 32 && !/replace[-_ ]?me|change[-_ ]?me|example|default/i.test(jwtSecret),
  jwtSecret ? 'set (redacted)' : '<unset>'
);

const mongoUri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
let mongoHost = '<unset/invalid>';
let mongoIsLocal = false;
if (mongoUri) {
  const match = mongoUri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?(\[[^\]]+\]|[^:/?]+)/i);
  mongoHost = match?.[1]?.replace(/^\[|\]$/g, '') || '<invalid>';
  mongoIsLocal = isLocalHost(mongoHost);
}
add('MongoDB production URI', Boolean(mongoUri) && !mongoIsLocal, `${mongoHost}/${process.env.MONGODB_DB || '<default>'}`);

if (mongoUri && !mongoIsLocal) {
  try {
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 12000 });
    await client.connect();
    await client.db(process.env.MONGODB_DB || undefined).command({ ping: 1 });
    await client.close();
    add('MongoDB connectivity', true, 'ping succeeded');
  } catch (error) {
    add('MongoDB connectivity', false, error.message);
  }
}

const resendKey = String(process.env.RESEND_API_KEY || '').trim();
const fromEmail = String(process.env.FROM_EMAIL || process.env.STAFF_EMAIL_FROM || '').trim();
const adminRecipients = String(
  process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || process.env.STAFF_ALERT_EMAIL || ''
).trim();
const careerRecipients = String(
  process.env.CAREER_ADMIN_EMAIL || process.env.HR_EMAIL || adminRecipients
).trim();
add('Resend API key', resendKey.startsWith('re_'), resendKey ? 'set (redacted)' : '<unset>');
add(
  'Verified email sender',
  /@[^>\s]+\.[^>\s]+>?$/.test(fromEmail) && !fromEmail.includes('onboarding@resend.dev'),
  fromEmail || '<unset>'
);
add('Reservation admin email', Boolean(adminRecipients), adminRecipients || '<unset>');
add('Career/HR email', Boolean(careerRecipients), careerRecipients || '<unset>');
add('Production mail catch-all disabled', !String(process.env.MAIL_CATCH_ALL || '').trim(), process.env.MAIL_CATCH_ALL ? 'set' : '<unset>');

add(
  'Google Places API key',
  Boolean(String(process.env.GOOGLE_PLACES_API_KEY || '').trim()),
  process.env.GOOGLE_PLACES_API_KEY ? 'set (redacted)' : '<unset>'
);

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'}  ${check.name}: ${check.detail}`);
}

const failures = checks.filter((check) => !check.pass);
console.log(`\n${checks.length - failures.length}/${checks.length} production checks passed.`);
if (failures.length) process.exitCode = 1;
