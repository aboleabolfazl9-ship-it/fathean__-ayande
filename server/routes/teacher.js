import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireRole, requireTeacherPermission, logActivity } from '../auth.js';

const router = Router();
router.use(requireRole('teacher'));

async function getTeacher(userId) {
  const { rows } = await query('SELECT * FROM teachers WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function teacherClassIds(teacherId) {
  const { rows } = await query(
    `SELECT DISTINCT a.class_id AS id, a.class_id, c.name, c.code, c.grade,
            (SELECT count(*)::int FROM students s WHERE s.class_id = a.class_id) AS students_count
       FROM teacher_assignments a JOIN classes c ON c.id = a.class_id
      WHERE a.teacher_id = $1 AND a.class_id IS NOT NULL`,
    [teacherId],
  );
  return rows;
}

router.get('/overview', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'پروفایل معلمی برای این حساب ثبت نشده است.' });
  const classes = await teacherClassIds(teacher.id);
  const classIds = classes.map((c) => c.id);
  const [students, exams, announcements, recentGrades] = await Promise.all([
    classIds.length
      ? query('SELECT count(*)::int AS n FROM students WHERE class_id = ANY($1::int[])', [classIds])
      : { rows: [{ n: 0 }] },
    classIds.length
      ? query(
          `SELECT e.id, e.title, e.exam_date, c.name AS class_name, sub.title AS subject
             FROM exams e JOIN classes c ON c.id = e.class_id
             LEFT JOIN subjects sub ON sub.id = e.subject_id
            WHERE e.class_id = ANY($1::int[]) AND e.exam_date >= CURRENT_DATE
            ORDER BY e.exam_date ASC LIMIT 8`,
          [classIds],
        )
      : { rows: [] },
    query(
      `SELECT id, title, body, published_at FROM announcements
        WHERE status = 'published' AND category IN ('public','teachers')
        ORDER BY published_at DESC NULLS LAST LIMIT 6`,
    ),
    classIds.length
      ? query(
          `SELECT g.id, g.score, g.updated_at, s.full_name, e.title AS exam_title
             FROM grades g JOIN students s ON s.id = g.student_id
             JOIN exams e ON e.id = g.exam_id
            WHERE e.class_id = ANY($1::int[]) ORDER BY g.updated_at DESC LIMIT 8`,
          [classIds],
        )
      : { rows: [] },
  ]);
  res.json({
    teacher: { id: teacher.id, fullName: teacher.full_name, field: teacher.field },
    permissions: req.user.permissions || {},
    classes,
    studentsCount: students.rows[0].n,
    upcomingExams: exams.rows,
    announcements: announcements.rows,
    recentGrades: recentGrades.rows,
  });
});

router.get('/classes', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'پروفایل معلمی یافت نشد.' });
  res.json(await teacherClassIds(teacher.id));
});

router.get('/students', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'پروفایل معلمی یافت نشد.' });
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const classId = req.query.classId ? Number(req.query.classId) : null;
  if (classId && !allowed.includes(classId)) {
    return res.status(403).json({ error: 'این کلاس به شما اختصاص داده نشده است.' });
  }
  const ids = classId ? [classId] : allowed;
  if (ids.length === 0) return res.json([]);
  const { rows } = await query(
    `SELECT s.id, s.full_name, s.student_code, c.name AS class_name, c.id AS class_id,
            COALESCE(SUM(t.amount),0)::int AS total
       FROM students s JOIN classes c ON c.id = s.class_id
       LEFT JOIN jenm_transactions t ON t.student_id = s.id
      WHERE s.class_id = ANY($1::int[])
      GROUP BY s.id, c.name, c.id ORDER BY c.code, s.full_name`,
    [ids],
  );
  res.json(rows);
});

router.get('/exams', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'پروفایل معلمی یافت نشد.' });
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  if (allowed.length === 0) return res.json([]);
  const { rows } = await query(
    `SELECT e.*, c.name AS class_name, sub.title AS subject,
            (SELECT count(*)::int FROM grades g WHERE g.exam_id = e.id) AS graded_count
       FROM exams e JOIN classes c ON c.id = e.class_id
       LEFT JOIN subjects sub ON sub.id = e.subject_id
      WHERE e.class_id = ANY($1::int[]) ORDER BY e.exam_date DESC`,
    [allowed],
  );
  res.json(rows);
});

router.post('/exams', requireTeacherPermission('can_exams'), async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const body = req.body || {};
  const classId = Number(body.classId);
  if (!allowed.includes(classId)) {
    return res.status(403).json({ error: 'فقط برای کلاس‌های اختصاص‌یافته می‌توانید امتحان ایجاد کنید.' });
  }
  if (!body.title || !body.examDate) return res.status(400).json({ error: 'عنوان و تاریخ امتحان الزامی است.' });
  const { rows } = await query(
    `INSERT INTO exams (title, subject_id, class_id, exam_date, start_time, duration_minutes, max_score, type, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      String(body.title).slice(0, 160),
      body.subjectId || null,
      classId,
      body.examDate,
      body.startTime || null,
      Number(body.durationMinutes) || 90,
      Number(body.maxScore) || 20,
      body.type || 'midterm',
      body.description || null,
      req.user.id,
    ],
  );
  await logActivity(req.user, 'ایجاد امتحان', 'exam', rows[0].id, { title: body.title });
  res.status(201).json({ id: rows[0].id });
});

router.get('/grades', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const examId = Number(req.query.examId);
  const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [examId]);
  const exam = examRows[0];
  if (!exam || !allowed.includes(exam.class_id)) {
    return res.status(403).json({ error: 'دسترسی به این امتحان مجاز نیست.' });
  }
  const { rows } = await query(
    `SELECT s.id AS student_id, s.full_name, g.score, g.note, g.updated_at
       FROM students s LEFT JOIN grades g ON g.student_id = s.id AND g.exam_id = $2
      WHERE s.class_id = $1 ORDER BY s.full_name`,
    [exam.class_id, examId],
  );
  res.json({ exam, students: rows });
});

router.post('/grades', requireTeacherPermission('can_grade'), async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const examId = Number(req.body?.examId);
  const entries = Array.isArray(req.body?.grades) ? req.body.grades : [];
  const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [examId]);
  const exam = examRows[0];
  if (!exam || !allowed.includes(exam.class_id)) {
    return res.status(403).json({ error: 'ثبت نمره برای این امتحان مجاز نیست.' });
  }
  const max = Number(exam.max_score);
  const valid = [];
  for (const entry of entries) {
    if (entry.score === '' || entry.score === null || entry.score === undefined) continue;
    const score = Number(entry.score);
    if (Number.isNaN(score) || score < 0 || score > max) {
      return res.status(400).json({ error: `نمره باید بین ۰ و ${max} باشد.` });
    }
    valid.push({ studentId: Number(entry.studentId), score, note: entry.note || null });
  }
  if (valid.length === 0) return res.status(400).json({ error: 'نمره‌ای برای ثبت ارسال نشده است.' });
  const studentIds = valid.map((v) => v.studentId);
  const { rows: checkRows } = await query(
    'SELECT id FROM students WHERE class_id = $1 AND id = ANY($2::int[])',
    [exam.class_id, studentIds],
  );
  const allowedStudents = new Set(checkRows.map((r) => r.id));
  if (studentIds.some((id) => !allowedStudents.has(id))) {
    return res.status(403).json({ error: 'ثبت نمره فقط برای دانش‌آموزان همین کلاس مجاز است.' });
  }
  let saved = 0;
  await withTransaction(async (client) => {
    for (const entry of valid) {
      const existing = await client.query(
        'SELECT id, score FROM grades WHERE exam_id = $1 AND student_id = $2',
        [examId, entry.studentId],
      );
      if (existing.rowCount > 0) {
        const old = existing.rows[0];
        if (Number(old.score) === entry.score) continue;
        await client.query(
          `UPDATE grades SET score=$1, note=$2, updated_by=$3, updated_at=now() WHERE id=$4`,
          [entry.score, entry.note, req.user.id, old.id],
        );
        await client.query(
          `INSERT INTO grade_history (grade_id, exam_id, student_id, old_score, new_score, reason, changed_by, changed_by_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [old.id, examId, entry.studentId, old.score, entry.score, 'ویرایش نمره توسط معلم', req.user.id, req.user.full_name],
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO grades (exam_id, student_id, score, note, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
          [examId, entry.studentId, entry.score, entry.note, req.user.id],
        );
        await client.query(
          `INSERT INTO grade_history (grade_id, exam_id, student_id, old_score, new_score, reason, changed_by, changed_by_name)
           VALUES ($1,$2,$3,NULL,$4,$5,$6,$7)`,
          [inserted.rows[0].id, examId, entry.studentId, entry.score, 'ثبت اولیه نمره', req.user.id, req.user.full_name],
        );
      }
      saved += 1;
    }
  });
  await logActivity(req.user, 'ثبت/ویرایش نمرات', 'exam', examId, { saved });
  res.json({ ok: true, saved });
});

router.get('/announcements', async (req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.title, a.body, a.category, a.published_at, a.author_name, c.name AS class_name
       FROM announcements a LEFT JOIN classes c ON c.id = a.class_id
      WHERE a.status = 'published' AND a.category IN ('public','teachers','class')
      ORDER BY a.published_at DESC NULLS LAST LIMIT 40`,
  );
  res.json(rows);
});

router.post('/announcements', requireTeacherPermission('can_announce'), async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const body = req.body || {};
  const classId = Number(body.classId);
  if (!allowed.includes(classId)) {
    return res.status(403).json({ error: 'انتشار اطلاعیه فقط برای کلاس‌های اختصاص‌یافته مجاز است.' });
  }
  if (!body.title || !body.body) return res.status(400).json({ error: 'عنوان و متن اطلاعیه الزامی است.' });
  const { rows } = await query(
    `INSERT INTO announcements (title, body, category, audience, class_id, status, author_id, author_name, published_at)
     VALUES ($1,$2,'class','class',$3,'published',$4,$5,now()) RETURNING id`,
    [String(body.title).slice(0, 160), String(body.body), classId, req.user.id, req.user.full_name],
  );
  await logActivity(req.user, 'انتشار اطلاعیه کلاسی', 'announcement', rows[0].id);
  res.status(201).json({ id: rows[0].id });
});

router.post('/jenm', requireTeacherPermission('can_jenm'), async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  const { studentId, kind, amount, reason } = req.body || {};
  const value = Number(amount);
  if (!['add', 'subtract'].includes(kind)) return res.status(400).json({ error: 'نوع تراکنش نامعتبر است.' });
  if (!Number.isInteger(value) || value <= 0) return res.status(400).json({ error: 'مقدار امتیاز باید عددی مثبت باشد.' });
  if (!reason || String(reason).trim().length < 3) return res.status(400).json({ error: 'ثبت دلیل برای تغییر امتیاز الزامی است.' });
  const { rows } = await query('SELECT id, class_id, full_name FROM students WHERE id = $1', [Number(studentId)]);
  const student = rows[0];
  if (!student || !allowed.includes(student.class_id)) {
    return res.status(403).json({ error: 'ثبت امتیاز فقط برای دانش‌آموزان کلاس‌های شما مجاز است.' });
  }
  const signed = kind === 'subtract' ? -value : value;
  const inserted = await query(
    `INSERT INTO jenm_transactions (student_id, amount, kind, reason, created_by, created_by_name, created_by_role)
     VALUES ($1,$2,$3,$4,$5,$6,'teacher') RETURNING id`,
    [student.id, signed, kind, String(reason).slice(0, 300), req.user.id, req.user.full_name],
  );
  await logActivity(req.user, 'ثبت امتیاز جنم', 'jenm', inserted.rows[0].id, { student: student.full_name, amount: signed });
  res.status(201).json({ id: inserted.rows[0].id });
});

router.get('/reports', async (req, res) => {
  const teacher = await getTeacher(req.user.id);
  const allowed = (await teacherClassIds(teacher.id)).map((c) => c.id);
  if (allowed.length === 0) return res.json({ classes: [] });
  const { rows } = await query(
    `SELECT c.id, c.name, sub.title AS subject,
            round(avg(g.score), 2) AS average, count(g.id)::int AS graded,
            min(g.score) AS min_score, max(g.score) AS max_score
       FROM classes c
       LEFT JOIN exams e ON e.class_id = c.id
       LEFT JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN grades g ON g.exam_id = e.id
      WHERE c.id = ANY($1::int[])
      GROUP BY c.id, c.name, sub.title
      ORDER BY c.code`,
    [allowed],
  );
  res.json({ classes: rows });
});

router.get('/profile', async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.full_name, t.field, t.phone, t.email, u.username
       FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.user_id = $1`,
    [req.user.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'پروفایل معلمی یافت نشد.' });
  res.json(rows[0]);
});

router.patch('/profile', async (req, res) => {
  const { phone, field } = req.body || {};
  const teacher = await getTeacher(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'پروفایل معلمی یافت نشد.' });
  await query('UPDATE teachers SET phone = COALESCE($1, phone), field = COALESCE($2, field) WHERE id = $3', [
    phone ? String(phone).slice(0, 30) : null,
    field ? String(field).slice(0, 120) : null,
    teacher.id,
  ]);
  if (phone) await query('UPDATE users SET phone = $1 WHERE id = $2', [String(phone).slice(0, 30), req.user.id]);
  await logActivity(req.user, 'ویرایش پروفایل معلم', 'teacher', teacher.id);
  res.json({ ok: true });
});

router.get('/lookups', async (_req, res) => {
  const [subjects, classes] = await Promise.all([
    query('SELECT id, title FROM subjects WHERE is_active ORDER BY title'),
    query('SELECT id, name, code FROM classes ORDER BY code'),
  ]);
  res.json({ subjects: subjects.rows, classes: classes.rows });
});

export default router;
