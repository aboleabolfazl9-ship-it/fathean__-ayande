import { Router } from 'express';
import { query } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  hashInvite,
  issueSession,
  clearSession,
  requireAuth,
  logActivity,
} from '../auth.js';

const router = Router();

const PASSWORD_RULE = /^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\d).{8,}$/;

router.post('/login', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!identifier || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد کنید.' });
  }
  const { rows } = await query(
    `SELECT id, username, email, full_name, role, password_hash, is_active, permissions, must_change_password
       FROM users WHERE lower(username) = $1 OR lower(coalesce(email,'')) = $1 LIMIT 1`,
    [identifier],
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست است.' });
  }
  if (!user.password_hash) {
    return res.status(403).json({
      error: 'برای این حساب هنوز رمز عبور تعیین نشده است. کد دعوت دریافتی از مدرسه را در صفحه فعال‌سازی حساب وارد کنید.',
      needsInvite: true,
    });
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست است.' });

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  issueSession(res, user);
  await logActivity(user, 'ورود به سامانه', 'auth', user.id);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      mustChangePassword: user.must_change_password,
      permissions: user.permissions,
    },
  });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role,
      phone: req.user.phone,
      permissions: req.user.permissions,
      mustChangePassword: req.user.must_change_password,
    },
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (!PASSWORD_RULE.test(next)) {
    return res.status(400).json({ error: 'رمز جدید باید حداقل ۸ نویسه و شامل حرف و رقم باشد.' });
  }
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const ok = await verifyPassword(current, rows[0]?.password_hash);
  if (!ok) return res.status(400).json({ error: 'رمز عبور فعلی نادرست است.' });
  const hash = await hashPassword(next);
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [
    hash,
    req.user.id,
  ]);
  await logActivity(req.user, 'تغییر رمز عبور', 'user', req.user.id);
  res.json({ ok: true });
});

// Redeem a one-time invitation code issued by the school admin.
router.post('/redeem-invite', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();
  const password = String(req.body?.password || '');
  if (!identifier || !code || !password) {
    return res.status(400).json({ error: 'همه فیلدها الزامی است.' });
  }
  if (!PASSWORD_RULE.test(password)) {
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۸ نویسه و شامل حرف و رقم باشد.' });
  }
  const { rows } = await query(
    `SELECT id, username, email, full_name, role, is_active, invite_code_hash, invite_expires_at
       FROM users WHERE lower(username) = $1 OR lower(coalesce(email,'')) = $1 LIMIT 1`,
    [identifier],
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(400).json({ error: 'حسابی با این نام کاربری یافت نشد.' });
  }
  if (!user.invite_code_hash || !user.invite_expires_at || new Date(user.invite_expires_at) < new Date()) {
    return res.status(400).json({ error: 'کد دعوت منقضی شده است. از مدیر مدرسه کد جدید بخواهید.' });
  }
  if (user.invite_code_hash !== hashInvite(code)) {
    return res.status(400).json({ error: 'کد دعوت نادرست است.' });
  }
  const hash = await hashPassword(password);
  await query(
    `UPDATE users SET password_hash = $1, invite_code_hash = NULL, invite_expires_at = NULL,
       must_change_password = false WHERE id = $2`,
    [hash, user.id],
  );
  issueSession(res, user);
  await logActivity(user, 'فعال‌سازی حساب با کد دعوت', 'auth', user.id);
  res.json({
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
  });
});

router.get('/invite-info', async (req, res) => {
  const identifier = String(req.query.identifier || '').trim().toLowerCase();
  if (!identifier) return res.status(400).json({ error: 'نام کاربری را وارد کنید.' });
  const { rows } = await query(
    `SELECT full_name, role, is_active, invite_code_hash, invite_expires_at
       FROM users WHERE lower(username) = $1 LIMIT 1`,
    [identifier],
  );
  if (!rows[0]) return res.json({ found: false });
  const u = rows[0];
  res.json({
    found: true,
    fullName: u.full_name,
    role: u.role,
    hasOpenInvite: Boolean(u.invite_code_hash && u.invite_expires_at && new Date(u.invite_expires_at) > new Date()),
  });
});

export default router;
