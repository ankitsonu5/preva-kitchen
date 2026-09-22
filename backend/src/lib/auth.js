import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { col, asObjectId } from './db.js';

export const SESSION_COOKIE = 'preva_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export function jwtSecret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('A strong JWT_SECRET is required in production.');
    }
    return 'preva_super_secret_jwt_key_2026_default_key';
  }
  return value;
}

export function signSession(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role, name: user.name },
    jwtSecret(),
    { expiresIn: SESSION_MAX_AGE }
  );
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE
};

/**
 * Resolve the caller from the request.
 *
 * The token is verified on every call and the user row is re-read, so an
 * account disabled in the admin loses access on its next request rather than
 * when its token happens to expire.
 */
export async function currentUser(request) {
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookie = request.cookies?.get?.(SESSION_COOKIE)?.value || null;
  const token = bearer || cookie;
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    return null;
  }

  const users = await col('users');
  const user = await users.findOne({ _id: asObjectId(payload.sub) });
  if (!user || user.status === 'DISABLED') return null;

  return { id: user._id.toString(), email: user.email, role: user.role, name: user.name || '', mustChangePassword: user.mustChangePassword === true };
}

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER'];

export function hasRole(user, ...allowed) {
  return Boolean(user && allowed.includes(user.role));
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* ── login throttling ─────────────────────────────────────────────────────
   Backed by Mongo (a `loginAttempts` collection, TTL-cleaned) instead of an
   in-process Map, so the window is shared across every backend instance —
   an attacker can't dodge the throttle by landing on a different process. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function loginBlocked(key) {
  if (process.env.NODE_ENV !== 'production') return false;
  const attempts = await col('loginAttempts');
  const record = await attempts.findOne({ key });
  if (!record) return false;
  if (Date.now() - new Date(record.first).getTime() > WINDOW_MS) {
    await attempts.deleteOne({ key });
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export async function noteFailedLogin(key) {
  const attempts = await col('loginAttempts');
  const record = await attempts.findOne({ key });
  const now = new Date();
  if (!record || now.getTime() - new Date(record.first).getTime() > WINDOW_MS) {
    await attempts.updateOne({ key }, { $set: { key, count: 1, first: now } }, { upsert: true });
    return;
  }
  await attempts.updateOne({ key }, { $inc: { count: 1 } });
}

export async function clearLoginAttempts(key) {
  const attempts = await col('loginAttempts');
  await attempts.deleteOne({ key });
}
