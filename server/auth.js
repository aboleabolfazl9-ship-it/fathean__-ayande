import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is missing — sessions will not be secure');
}
const COOKIE_NAME = 'fatehan_session';
const SESSION_DAYS = 7;

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash || '');

export function randomInviteCode() {
  // 8 characters, human friendly (no ambiguous chars)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const hashInvite = (code) =>
  crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');

export function issueSession(res, user) {
  const token = jwt.sign(
    { uid: user.id, role: user.role, v: user.session_version || 1 },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` },
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function loadUser(req, _res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await query(
      `SELECT id, username, email, full_name, role, phone, permissions, is_active, must_change_password
         FROM users WHERE id = $1`,
      [payload.uid],
    );
    const user = rows[0];
    if (user && user.is_active) req.user = user;
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'برای انجام این عملیات باید وارد حساب خود شوید.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'برای انجام این عملیات باید وارد حساب خود شوید.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'شما به این بخش دسترسی ندارید.' });
    }
    next();
  };
}

export function teacherCan(user, permission) {
  return Boolean(user?.permissions?.[permission]);
}

export function requireTeacherPermission(permission) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    if (req.user?.role !== 'teacher' || !teacherCan(req.user, permission)) {
      return res.status(403).json({ error: 'مجوز لازم برای این عملیات توسط مدیر به شما داده نشده است.' });
    }
    next();
  };
}

export async function logActivity(user, action, entity, entityId, meta = null) {
  try {
    await query(
      `INSERT INTO activity_logs (actor_id, actor_name, actor_role, action, entity, entity_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user?.id ?? null, user?.full_name ?? 'سیستم', user?.role ?? 'system', action, entity, entityId, meta],
    );
  } catch (err) {
    console.error('[log] failed', err.message);
  }
}
