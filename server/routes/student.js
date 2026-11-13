import { Router } from 'express';
import { query } from '../db.js';
import { requireRole, logActivity } from '../auth.js';
import {
  studentContext,
  studentAnnouncements,
  studentCalendar,
  studentExams,
  studentGrades,
  studentHonors,
  studentRanking,
} from '../studentData.js';
import { classTotals, campTotals } from '../rankings.js';

const router = Router();
router.use(requireRole('student'));

async function me(req, res) {
  const student = await studentContext(req.user.id);
  if (!student) {
    res.status(404).json({ error: 'پروفایل دانش‌آموزی برای این حساب یافت نشد.' });
    return null;
  }
  return student;
}

router.get('/overview', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const [grades, exams, announcements, honors, ranking] = await Promise.all([
    studentGrades(student),
    studentExams(student),
    studentAnnouncements(student),
    studentHonors(student.id),
    studentRanking(student),
  ]);
  const upcoming = exams
    .filter((e) => new Date(e.exam_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
    .slice(0, 5);
  const average =
    grades.length > 0
      ? Number((grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length).toFixed(2))
      : null;
  res.json({
    student: {
      id: student.id,
      fullName: student.full_name,
      studentCode: student.student_code,
      className: student.class_name,
      classCode: student.class_code,
      grade: student.grade,
      campName: student.camp_name,
      campSlot: student.camp_slot,
      campColor: student.camp_color,
    },
    jenmTotal: ranking.total,
    rank: ranking.rank,
    outOf: ranking.of,
    average,
    latestGrades: grades.slice(0, 5),
    upcomingExams: upcoming,
    announcements: announcements.slice(0, 5),
    recentHonors: honors.slice(0, 3),
  });
});

router.get('/me', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  res.json({
    id: student.id,
    fullName: student.full_name,
    studentCode: student.student_code,
    username: student.username,
    email: student.email,
    phone: student.phone || student.user_phone || '',
    guardianName: student.guardian_name || '',
    guardianPhone: student.guardian_phone || '',
    address: student.address || '',
    className: student.class_name,
    classCode: student.class_code,
    grade: student.grade,
    campName: student.camp_name,
    campSlot: student.camp_slot,
  });
});

// Students may only edit their own permitted contact details.
router.patch('/me', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const allowed = ['phone', 'guardian_phone', 'guardian_name', 'address'];
  const body = req.body || {};
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (key in body) {
      const value = String(body[key] ?? '').slice(0, 200);
      if (key === 'phone' || key === 'guardian_phone') {
        if (value && !/^[0-9+\-\s()]{7,20}$/.test(value)) {
          return res.status(400).json({ error: 'شماره تلفن معتبر نیست.' });
        }
        updates.push(`${key} = $${values.length + 1}`);
        values.push(value);
        if (key === 'phone') {
          await query('UPDATE users SET phone = $1 WHERE id = $2', [value, req.user.id]);
        }
      } else {
        updates.push(`${key} = $${values.length + 1}`);
        values.push(value);
      }
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'هیچ تغییر مجازی ارسال نشده است.' });
  values.push(student.id);
  await query(`UPDATE students SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
  await logActivity(req.user, 'ویرایش پروفایل دانش‌آموز', 'student', student.id);
  res.json({ ok: true });
});

router.get('/class', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const [classes, classmates, announcements, exams] = await Promise.all([
    classTotals(),
    query(
      `SELECT s.id, s.full_name, s.student_code, COALESCE(SUM(t.amount),0)::int AS total
         FROM students s LEFT JOIN jenm_transactions t ON t.student_id = s.id
        WHERE s.class_id = $1 GROUP BY s.id ORDER BY s.full_name`,
      [student.class_id],
    ),
    query(
      `SELECT id, title, body, published_at FROM announcements
        WHERE status='published' AND category='class' AND class_id = $1
        ORDER BY published_at DESC NULLS LAST LIMIT 20`,
      [student.class_id],
    ),
    query(
      `SELECT e.id, e.title, e.exam_date, sub.title AS subject FROM exams e
         LEFT JOIN subjects sub ON sub.id = e.subject_id
        WHERE e.class_id = $1 AND e.exam_date >= CURRENT_DATE ORDER BY e.exam_date LIMIT 10`,
      [student.class_id],
    ),
  ]);
  res.json({
    className: student.class_name,
    classCode: student.class_code,
    grade: student.grade,
    classRank: classes.find((c) => c.id === student.class_id) || null,
    classmates: classmates.rows,
    announcements: announcements.rows,
    upcomingExams: exams.rows,
  });
});

router.get('/camp', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const camps = await campTotals();
  const camp = camps.find((c) => c.id === student.camp_id) || null;
  const [members, announcements, honors] = await Promise.all([
    camp
      ? query(
          `SELECT s.id, s.full_name, COALESCE(SUM(t.amount),0)::int AS total, c.code AS class_code
             FROM students s LEFT JOIN jenm_transactions t ON t.student_id = s.id
             LEFT JOIN classes c ON c.id = s.class_id
            WHERE s.camp_id = $1 GROUP BY s.id, c.code ORDER BY total DESC, s.full_name`,
          [camp.id],
        )
      : { rows: [] },
    camp
      ? query(
          `SELECT id, title, body, published_at FROM announcements
            WHERE status='published' AND category='camp' AND camp_id = $1
            ORDER BY published_at DESC NULLS LAST LIMIT 20`,
          [camp.id],
        )
      : { rows: [] },
    camp
      ? query(
          `SELECT h.id, h.title, h.description, h.awarded_on FROM honors h
            WHERE h.camp_id = $1 ORDER BY h.awarded_on DESC NULLS LAST LIMIT 20`,
          [camp.id],
        )
      : { rows: [] },
  ]);
  res.json({
    camp,
    members: members.rows,
    announcements: announcements.rows,
    honors: honors.rows,
    assigned: Boolean(camp),
  });
});

router.get('/jenm', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const [transactions, ranking] = await Promise.all([
    query(
      `SELECT id, amount, kind, reason, created_by_name, created_by_role, created_at
         FROM jenm_transactions WHERE student_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [student.id],
    ),
    studentRanking(student),
  ]);
  res.json({ total: ranking.total, rank: ranking.rank, of: ranking.of, transactions: transactions.rows });
});

router.get('/ranking', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const [ranking, classes, camps] = await Promise.all([studentRanking(student), classTotals(), campTotals()]);
  res.json({ ...ranking, classes, camps, mine: { id: student.id, name: student.full_name } });
});

router.get('/grades', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  const grades = await studentGrades(student);
  const average =
    grades.length > 0
      ? Number((grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length).toFixed(2))
      : null;
  res.json({ grades, average });
});

router.get('/exams', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  res.json(await studentExams(student));
});

router.get('/honors', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  res.json(await studentHonors(student.id));
});

router.get('/announcements', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  res.json(await studentAnnouncements(student));
});

router.get('/calendar', async (req, res) => {
  const student = await me(req, res);
  if (!student) return;
  res.json(await studentCalendar(student));
});

export default router;
