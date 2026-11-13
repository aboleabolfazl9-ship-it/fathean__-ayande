import { Router } from 'express';
import { query } from '../db.js';
import { classTotals, campTotals, studentTotals } from '../rankings.js';

const router = Router();

const DEFAULT_SETTINGS = {
  schoolName: 'مدرسه فاتحان آینده',
  tagline: 'آینده را از امروز می‌سازیم',
  heroText:
    'در مدرسه فاتحان آینده، یادگیری، تلاش، خلاقیت و پیشرفت در کنار یکدیگر قرار می‌گیرند تا نسل آینده برای ساختن فردایی بهتر آماده شود.',
  aboutTitle: 'مدرسه فاتحان آینده',
  aboutText:
    'مدرسه فاتحان آینده محیطی برای رشد علمی، پرورش استعدادها و تقویت مهارت‌های فردی و اجتماعی دانش‌آموزان است. ما باور داریم هر دانش‌آموز توانایی ساختن آینده‌ای درخشان را دارد و مسیر این پیشرفت با آموزش هدفمند، تلاش و مسئولیت‌پذیری شکل می‌گیرد.',
  ctaTitle: 'آینده‌ای درخشان از همین‌جا آغاز می‌شود',
  ctaText: 'با ورود به سامانه مدرسه فاتحان آینده، مسیر پیشرفت تحصیلی و افتخارات خود را دنبال کنید.',
  contact: { phone: '', email: '', address: '', officeHours: '' },
  social: { instagram: '', telegram: '', whatsapp: '', aparat: '' },
  academicYear: '۱۴۰۴-۱۴۰۵',
  copyright: 'تمامی حقوق برای مدرسه فاتحان آینده محفوظ است.',
};

export async function readSettings() {
  const { rows } = await query('SELECT data FROM school_settings WHERE id = 1');
  const stored = rows[0]?.data || {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    contact: { ...DEFAULT_SETTINGS.contact, ...(stored.contact || {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(stored.social || {}) },
  };
}

router.get('/settings', async (_req, res) => {
  res.json(await readSettings());
});

router.get('/stats', async (_req, res) => {
  const [students, classes, camps, honors, news] = await Promise.all([
    query('SELECT count(*)::int AS n FROM students WHERE is_active'),
    query('SELECT count(*)::int AS n FROM classes'),
    query('SELECT count(*)::int AS n FROM camps'),
    query('SELECT count(*)::int AS n FROM honors'),
    query("SELECT count(*)::int AS n FROM news WHERE status = 'published'"),
  ]);
  res.json({
    students: students.rows[0].n,
    classes: classes.rows[0].n,
    camps: camps.rows[0].n,
    honors: honors.rows[0].n,
    news: news.rows[0].n,
  });
});

router.get('/classes', async (_req, res) => {
  const totals = await classTotals();
  res.json(totals);
});

router.get('/classes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const totals = await classTotals();
  const cls = totals.find((c) => c.id === id);
  if (!cls) return res.status(404).json({ error: 'کلاس یافت نشد.' });
  const [announcements, exams, subjects] = await Promise.all([
    query(
      `SELECT id, title, body, category, image_url, published_at
         FROM announcements
        WHERE status = 'published' AND category = 'class' AND class_id = $1
        ORDER BY published_at DESC NULLS LAST LIMIT 10`,
      [id],
    ),
    query(
      `SELECT e.id, e.title, e.exam_date, s.title AS subject
         FROM exams e LEFT JOIN subjects s ON s.id = e.subject_id
        WHERE e.class_id = $1 AND e.exam_date >= CURRENT_DATE
        ORDER BY e.exam_date ASC LIMIT 10`,
      [id],
    ),
    query(
      `SELECT DISTINCT s.id, s.title FROM subjects s JOIN exams e ON e.subject_id = s.id
        WHERE e.class_id = $1 ORDER BY s.title`,
      [id],
    ),
  ]);
  res.json({
    ...cls,
    announcements: announcements.rows,
    upcomingExams: exams.rows,
    subjects: subjects.rows,
  });
});

router.get('/camps', async (_req, res) => {
  const rows = await campTotals();
  res.json(rows);
});

router.get('/camps/:id', async (req, res) => {
  const id = Number(req.params.id);
  const rows = await campTotals();
  const camp = rows.find((c) => c.id === id);
  if (!camp) return res.status(404).json({ error: 'قرارگاه یافت نشد.' });
  const [announcements, honors] = await Promise.all([
    query(
      `SELECT id, title, body, published_at FROM announcements
        WHERE status = 'published' AND category = 'camp' AND camp_id = $1
        ORDER BY published_at DESC NULLS LAST LIMIT 10`,
      [id],
    ),
    query(
      `SELECT h.id, h.title, h.description, h.awarded_on, h.level FROM honors h
        WHERE h.camp_id = $1 ORDER BY h.awarded_on DESC NULLS LAST LIMIT 10`,
      [id],
    ),
  ]);
  res.json({ ...camp, announcements: announcements.rows, honors: honors.rows });
});

router.get('/news', async (req, res) => {
  const category = String(req.query.category || '');
  const params = [];
  let where = "WHERE status = 'published'";
  if (category && category !== 'all') {
    params.push(category);
    where += ` AND category = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT id, title, excerpt, category, image_url, published_at FROM news ${where}
      ORDER BY published_at DESC NULLS LAST LIMIT 60`,
    params,
  );
  res.json(rows);
});

router.get('/news/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, excerpt, body, category, image_url, published_at, author_name
       FROM news WHERE id = $1 AND status = 'published'`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'خبر یافت نشد.' });
  res.json(rows[0]);
});

router.get('/announcements', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, title, body, image_url, published_at FROM announcements
      WHERE status = 'published' AND category IN ('public','class')
      ORDER BY published_at DESC NULLS LAST LIMIT 20`,
  );
  res.json(rows);
});

router.get('/honors', async (_req, res) => {
  const { rows } = await query(
    `SELECT h.id, h.title, h.description, h.level, h.awarded_on, h.image_url,
            s.full_name AS student_name, c.name AS class_name, cp.name AS camp_name
       FROM honors h
       LEFT JOIN students s ON s.id = h.student_id
       LEFT JOIN classes c ON c.id = h.class_id
       LEFT JOIN camps cp ON cp.id = h.camp_id
      ORDER BY h.awarded_on DESC NULLS LAST, h.id DESC LIMIT 40`,
  );
  res.json(rows);
});

router.get('/events', async (req, res) => {
  const upcoming = req.query.upcoming === '1';
  const { rows } = await query(
    `SELECT e.id, e.title, e.description, e.event_date, e.end_date, e.type, c.name AS class_name
       FROM calendar_events e LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.audience IN ('all','students')
        ${upcoming ? 'AND e.event_date >= CURRENT_DATE' : ''}
      ORDER BY e.event_date ${upcoming ? 'ASC' : 'DESC'} LIMIT 30`,
  );
  res.json(rows);
});

router.get('/leaderboard', async (req, res) => {
  const scope = String(req.query.scope || 'students');
  if (scope === 'classes') return res.json(await classTotals());
  if (scope === 'camps') return res.json(await campTotals());
  const students = await studentTotals();
  const classes = await classTotals();
  const classById = new Map(classes.map((c) => [c.id, c]));
  res.json(
    students
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        fullName: s.full_name,
        total: s.total,
        rank: s.rank,
        className: classById.get(s.class_id)?.name || null,
      })),
  );
});

export default router;
