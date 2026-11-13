import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  requireRole,
  logActivity,
  randomInviteCode,
  hashInvite,
  hashPassword,
} from '../auth.js';
import { classTotals, campTotals, studentTotals, snapshotRankings } from '../rankings.js';
import { readSettings } from './public.js';

const router = Router();
router.use(requireRole('admin'));

const INVITE_DAYS = 7;

async function createInvite(userId) {
  const code = randomInviteCode();
  await query(
    `UPDATE users SET invite_code_hash = $1, invite_expires_at = now() + ($2 || ' days')::interval WHERE id = $3`,
    [hashInvite(code), String(INVITE_DAYS), userId],
  );
  return { code, expiresInDays: INVITE_DAYS };
}

/* ---------------------------------- overview --------------------------------- */
router.get('/overview', async (req, res) => {
  const [
    students,
    teachers,
    classes,
    camps,
    jenm,
    pending,
    upcomingExams,
    logs,
    campLess,
  ] = await Promise.all([
    query('SELECT count(*)::int AS n FROM students WHERE is_active'),
    query("SELECT count(*)::int AS n FROM users WHERE role='teacher' AND is_active"),
    query('SELECT count(*)::int AS n FROM classes'),
    query('SELECT count(*)::int AS n FROM camps'),
    query('SELECT COALESCE(SUM(amount),0)::int AS n FROM jenm_transactions'),
    query(`SELECT
      (SELECT count(*)::int FROM announcements WHERE status='draft') AS draft_announcements,
      (SELECT count(*)::int FROM news WHERE status='draft') AS draft_news,
      (SELECT count(*)::int FROM students WHERE camp_id IS NULL) AS students_without_camp,
      (SELECT count(*)::int FROM exams WHERE exam_date >= CURRENT_DATE AND id NOT IN (SELECT DISTINCT exam_id FROM grades)) AS exams_without_grades,
      (SELECT count(*)::int FROM users WHERE role IN ('student','teacher') AND password_hash IS NULL) AS inactive_invites`),
    query(
      `SELECT e.id, e.title, e.exam_date, c.name AS class_name FROM exams e
        JOIN classes c ON c.id = e.class_id
        WHERE e.exam_date >= CURRENT_DATE ORDER BY e.exam_date ASC LIMIT 6`,
    ),
    query('SELECT id, actor_name, actor_role, action, entity, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 10'),
    query('SELECT s.id, s.full_name, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE s.camp_id IS NULL LIMIT 5'),
  ]);
  const p = pending.rows[0];
  res.json({
    students: students.rows[0].n,
    teachers: teachers.rows[0].n,
    classes: classes.rows[0].n,
    camps: camps.rows[0].n,
    jenmTotal: jenm.rows[0].n,
    pending: {
      ...p,
      total: p.draft_announcements + p.draft_news + p.students_without_camp + p.exams_without_grades,
    },
    upcomingExams: upcomingExams.rows,
    recentActivity: logs.rows,
    studentsWithoutCamp: campLess.rows,
  });
});

/* ---------------------------------- students --------------------------------- */
router.get('/students', async (req, res) => {
  const params = [];
  const conditions = [];
  if (req.query.classId) {
    params.push(Number(req.query.classId));
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${String(req.query.search).trim()}%`);
    conditions.push(`(s.full_name ILIKE $${params.length} OR s.student_code ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT s.id, s.full_name, s.student_code, s.is_active, s.guardian_phone, s.guardian_name, s.phone,
            c.id AS class_id, c.name AS class_name, c.code AS class_code,
            cp.id AS camp_id, cp.name AS camp_name, cp.slot AS camp_slot,
            u.id AS user_id, u.username, u.last_login_at, u.password_hash IS NULL AS pending_activation,
            COALESCE((SELECT SUM(amount)::int FROM jenm_transactions t WHERE t.student_id = s.id), 0) AS jenm_total
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN camps cp ON cp.id = s.camp_id
       LEFT JOIN users u ON u.id = s.user_id
       ${where}
      ORDER BY c.code NULLS LAST, s.full_name
      LIMIT 400`,
    params,
  );
  res.json(rows);
});

router.post('/students', async (req, res) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const classId = Number(body.classId);
  if (!fullName) return res.status(400).json({ error: 'نام دانش‌آموز الزامی است.' });
  if (!classId) return res.status(400).json({ error: 'انتخاب کلاس الزامی است.' });
  const { rows: cls } = await query('SELECT code FROM classes WHERE id = $1', [classId]);
  if (!cls[0]) return res.status(400).json({ error: 'کلاس انتخاب‌شده معتبر نیست.' });
  const { rows: dup } = await query('SELECT id FROM students WHERE full_name = $1 AND class_id = $2', [fullName, classId]);
  if (dup[0]) return res.status(409).json({ error: 'این دانش‌آموز در این کلاس قبلاً ثبت شده است.' });
  const { rows: countRow } = await query('SELECT count(*)::int AS n FROM students WHERE class_id = $1', [classId]);
  const code = `F${cls[0].code.replace('/', '')}-${String(countRow[0].n + 1).padStart(2, '0')}`;
  let created;
  await withTransaction(async (client) => {
    const user = await client.query(
      `INSERT INTO users (username, full_name, role, password_hash) VALUES ($1,$2,'student',NULL)
       ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [code.toLowerCase(), fullName],
    );
    const student = await client.query(
      `INSERT INTO students (user_id, student_code, full_name, class_id, camp_id, guardian_name, guardian_phone, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [user.rows[0].id, code, fullName, classId, body.campId || null, body.guardianName || null, body.guardianPhone || null, body.phone || null],
    );
    created = student.rows[0].id;
  });
  const invite = await createInvite((await query('SELECT user_id FROM students WHERE id=$1', [created])).rows[0].user_id);
  await logActivity(req.user, 'ایجاد حساب دانش‌آموز', 'student', created, { fullName });
  res.status(201).json({ id: created, username: code.toLowerCase(), invite });
});

router.patch('/students/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const map = {
    full_name: body.fullName,
    class_id: body.classId !== undefined ? Number(body.classId) || null : undefined,
    camp_id: body.campId !== undefined ? Number(body.campId) || null : undefined,
    guardian_name: body.guardianName,
    guardian_phone: body.guardianPhone,
    phone: body.phone,
    address: body.address,
    is_active: body.isActive,
  };
  const fields = [];
  const values = [];
  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(value);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'تغییری ارسال نشده است.' });
  values.push(id);
  const { rows } = await query(`UPDATE students SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING user_id`, values);
  if (!rows[0]) return res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
  if (body.isActive !== undefined) {
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [Boolean(body.isActive), rows[0].user_id]);
  }
  if (body.fullName) await query('UPDATE users SET full_name = $1 WHERE id = $2', [body.fullName, rows[0].user_id]);
  await logActivity(req.user, 'ویرایش اطلاعات دانش‌آموز', 'student', id);
  res.json({ ok: true });
});

router.post('/students/:id/invite', async (req, res) => {
  const { rows } = await query('SELECT user_id, full_name FROM students WHERE id = $1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
  const invite = await createInvite(rows[0].user_id);
  await logActivity(req.user, 'صدور کد دعوت', 'user', rows[0].user_id, { name: rows[0].full_name });
  res.json(invite);
});

/* ----------------------------------- classes ---------------------------------- */
router.get('/classes', async (req, res) => {
  const totals = await classTotals();
  res.json(totals);
});

router.patch('/classes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const map = {
    name: body.name,
    description: body.description,
    image_url: body.imageUrl,
    academic_year: body.academicYear,
  };
  const fields = [];
  const values = [];
  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(value);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'تغییری ارسال نشده است.' });
  values.push(id);
  await query(`UPDATE classes SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  await logActivity(req.user, 'ویرایش کلاس', 'class', id);
  res.json({ ok: true });
});

router.post('/classes', async (req, res) => {
  const { code, grade, gradeLevel, section, name } = req.body || {};
  if (!code || !grade || !gradeLevel || !section) {
    return res.status(400).json({ error: 'کد، پایه و شماره کلاس الزامی است.' });
  }
  const { rows } = await query(
    `INSERT INTO classes (code, grade, grade_level, section, name) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (code) DO NOTHING RETURNING id`,
    [code, grade, Number(gradeLevel), Number(section), name || `پایه ${grade} — کلاس ${code}`],
  );
  if (!rows[0]) return res.status(409).json({ error: 'کلاسی با این کد وجود دارد.' });
  await logActivity(req.user, 'ایجاد کلاس', 'class', rows[0].id, { code });
  res.status(201).json({ id: rows[0].id });
});

/* ----------------------------------- teachers --------------------------------- */
router.get('/teachers', async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.full_name, t.field, t.phone, t.email, t.is_active, u.id AS user_id,
            u.username, u.email AS user_email, u.permissions, u.is_active AS user_active,
            u.password_hash IS NULL AS pending_activation,
            COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL), '[]') AS classes
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN teacher_assignments a ON a.teacher_id = t.id
       LEFT JOIN classes c ON c.id = a.class_id
      GROUP BY t.id, u.id
      ORDER BY t.full_name`,
  );
  res.json(rows);
});

router.post('/teachers', async (req, res) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const username = String(body.username || '').trim().toLowerCase();
  if (!fullName || !username) return res.status(400).json({ error: 'نام و نام کاربری معلم الزامی است.' });
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'نام کاربری باید انگلیسی، بین ۳ تا ۳۲ نویسه باشد.' });
  }
  const exists = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (exists.rowCount) return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده است.' });
  let teacherId;
  let userId;
  await withTransaction(async (client) => {
    const user = await client.query(
      `INSERT INTO users (username, email, full_name, role, phone, password_hash, permissions)
       VALUES ($1,$2,$3,'teacher',$4,NULL,$5) RETURNING id`,
      [
        username,
        body.email || null,
        fullName,
        body.phone || null,
        { can_grade: true, can_exams: false, can_jenm: false, can_announce: false },
      ],
    );
    userId = user.rows[0].id;
    const teacher = await client.query(
      `INSERT INTO teachers (user_id, full_name, field, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [userId, fullName, body.field || null, body.phone || null, body.email || null],
    );
    teacherId = teacher.rows[0].id;
    for (const classId of body.classIds || []) {
      await client.query('INSERT INTO teacher_assignments (teacher_id, class_id) VALUES ($1,$2)', [teacherId, Number(classId)]);
    }
  });
  const invite = await createInvite(userId);
  await logActivity(req.user, 'ایجاد حساب معلم', 'teacher', teacherId, { fullName });
  res.status(201).json({ id: teacherId, username, invite });
});

router.patch('/teachers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const { rows } = await query('SELECT user_id FROM teachers WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'معلم یافت نشد.' });
  const userId = rows[0].user_id;
  await withTransaction(async (client) => {
    if (body.fullName || body.field || body.phone !== undefined) {
      await client.query(
        `UPDATE teachers SET full_name = COALESCE($1, full_name), field = COALESCE($2, field), phone = COALESCE($3, phone) WHERE id = $4`,
        [body.fullName || null, body.field || null, body.phone ?? null, id],
      );
      if (body.fullName) await client.query('UPDATE users SET full_name = $1 WHERE id = $2', [body.fullName, userId]);
    }
    if (body.permissions && typeof body.permissions === 'object') {
      const allowed = ['can_grade', 'can_exams', 'can_jenm', 'can_announce', 'can_view_reports'];
      const permissions = {};
      for (const key of allowed) permissions[key] = Boolean(body.permissions[key]);
      await client.query('UPDATE users SET permissions = $1 WHERE id = $2 AND role = $3', [
        JSON.stringify(permissions),
        userId,
        'teacher',
      ]);
    }
    if (body.isActive !== undefined) {
      await client.query('UPDATE users SET is_active = $1 WHERE id = $2', [Boolean(body.isActive), userId]);
      await client.query('UPDATE teachers SET is_active = $1 WHERE id = $2', [Boolean(body.isActive), id]);
    }
    if (Array.isArray(body.classIds)) {
      await client.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [id]);
      for (const classId of body.classIds) {
        await client.query('INSERT INTO teacher_assignments (teacher_id, class_id) VALUES ($1,$2)', [id, Number(classId)]);
      }
    }
  });
  await logActivity(req.user, 'ویرایش حساب معلم', 'teacher', id);
  res.json({ ok: true });
});

router.post('/teachers/:id/invite', async (req, res) => {
  const { rows } = await query('SELECT user_id, full_name FROM teachers WHERE id = $1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'معلم یافت نشد.' });
  const invite = await createInvite(rows[0].user_id);
  await logActivity(req.user, 'صدور کد دعوت معلم', 'user', rows[0].user_id);
  res.json(invite);
});

/* ------------------------------------ camps ----------------------------------- */
router.get('/camps', async (req, res) => {
  const rows = await campTotals();
  const members = await query(
    `SELECT s.id, s.full_name, s.camp_id, c.code AS class_code FROM students s
      LEFT JOIN classes c ON c.id = s.class_id WHERE s.camp_id IS NOT NULL ORDER BY s.full_name`,
  );
  res.json(rows.map((r) => ({ ...r, members: members.rows.filter((m) => m.camp_id === r.id) })));
});

router.patch('/camps/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const map = {
    name: body.name !== undefined ? (String(body.name).trim() || null) : undefined,
    color: body.color,
    logo_url: body.logoUrl,
    description: body.description,
    is_active: body.isActive,
  };
  const fields = [];
  const values = [];
  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(value);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'تغییری ارسال نشده است.' });
  values.push(id);
  await query(`UPDATE camps SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  await logActivity(req.user, 'ویرایش قرارگاه', 'camp', id);
  res.json({ ok: true });
});

/* ------------------------------------- jenm ----------------------------------- */
router.get('/jenm', async (req, res) => {
  const params = [];
  const conditions = [];
  if (req.query.studentId) {
    params.push(Number(req.query.studentId));
    conditions.push(`t.student_id = $${params.length}`);
  }
  if (req.query.classId) {
    params.push(Number(req.query.classId));
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (req.query.campId) {
    params.push(Number(req.query.campId));
    conditions.push(`s.camp_id = $${params.length}`);
  }
  if (req.query.kind) {
    params.push(req.query.kind);
    conditions.push(`t.kind = $${params.length}`);
  }
  if (req.query.from) {
    params.push(req.query.from);
    conditions.push(`t.created_at >= $${params.length}::date`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    conditions.push(`t.created_at < ($${params.length}::date + interval '1 day')`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT t.id, t.amount, t.kind, t.reason, t.created_by_name, t.created_by_role, t.created_at,
            s.id AS student_id, s.full_name, c.name AS class_name, cp.name AS camp_name, cp.slot AS camp_slot
       FROM jenm_transactions t
       JOIN students s ON s.id = t.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN camps cp ON cp.id = s.camp_id
       ${where}
      ORDER BY t.created_at DESC LIMIT 300`,
    params,
  );
  const [classes, camps, students] = await Promise.all([classTotals(), campTotals(), studentTotals()]);
  res.json({
    transactions: rows,
    classTotals: classes,
    campTotals: camps,
    students: students.map((s) => ({ id: s.id, fullName: s.full_name, total: s.total, rank: s.rank })),
  });
});

router.post('/jenm', async (req, res) => {
  const { studentId, kind, amount, reason } = req.body || {};
  const value = Number(amount);
  if (!['add', 'subtract'].includes(kind)) return res.status(400).json({ error: 'نوع تراکنش نامعتبر است.' });
  if (!Number.isInteger(value) || value <= 0) return res.status(400).json({ error: 'مقدار امتیاز باید عدد مثبت باشد.' });
  if (!reason || String(reason).trim().length < 3) return res.status(400).json({ error: 'ثبت دلیل الزامی است.' });
  const { rows } = await query('SELECT id, full_name FROM students WHERE id = $1', [Number(studentId)]);
  if (!rows[0]) return res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
  const signed = kind === 'subtract' ? -value : value;
  let id;
  await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO jenm_transactions (student_id, amount, kind, reason, created_by, created_by_name, created_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,'admin') RETURNING id`,
      [rows[0].id, signed, kind, String(reason).slice(0, 300), req.user.id, req.user.full_name],
    );
    id = inserted.rows[0].id;
    await snapshotRankings(client, rows[0].id);
  });
  await logActivity(req.user, 'ثبت امتیاز جنم', 'jenm', id, { student: rows[0].full_name, amount: signed });
  res.status(201).json({ id });
});

router.post('/jenm/:id/reverse', async (req, res) => {
  const txId = Number(req.params.id);
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 3) return res.status(400).json({ error: 'ثبت دلیل اصلاح الزامی است.' });
  const { rows } = await query('SELECT * FROM jenm_transactions WHERE id = $1', [txId]);
  const tx = rows[0];
  if (!tx) return res.status(404).json({ error: 'تراکنش یافت نشد.' });
  const already = await query('SELECT id FROM jenm_transactions WHERE student_id = $1 AND reason = $2', [
    tx.student_id,
    `اصلاح تراکنش #${txId}: ${reason}`,
  ]);
  if (already.rowCount) return res.status(409).json({ error: 'این تراکنش قبلاً اصلاح شده است.' });
  const id = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO jenm_transactions (student_id, amount, kind, reason, created_by, created_by_name, created_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,'admin') RETURNING id`,
      [tx.student_id, -tx.amount, tx.amount > 0 ? 'subtract' : 'add', `اصلاح تراکنش #${txId}: ${reason}`, req.user.id, req.user.full_name],
    );
    await snapshotRankings(client, tx.student_id);
    return inserted.rows[0].id;
  });
  await logActivity(req.user, 'اصلاح تراکنش جنم', 'jenm', id, { original: txId, amount: -tx.amount });
  res.status(201).json({ id });
});

/* ----------------------------------- ranking ---------------------------------- */
router.get('/ranking', async (req, res) => {
  const [students, classes, camps] = await Promise.all([studentTotals(), classTotals(), campTotals()]);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const campById = new Map(camps.map((c) => [c.id, c]));
  res.json({
    students: students
      .sort((a, b) => a.rank - b.rank)
      .map((s) => ({
        id: s.id,
        fullName: s.full_name,
        studentCode: s.student_code,
        total: s.total,
        rank: s.rank,
        className: classById.get(s.class_id)?.name || null,
        classId: s.class_id,
        campName: campById.get(s.camp_id)?.name || (s.camp_id ? `قرارگاه ${campById.get(s.camp_id)?.slot}` : null),
      })),
    classes,
    camps,
  });
});

router.get('/ranking/history', async (req, res) => {
  const scope = String(req.query.scope || 'student');
  const { rows } = await query(
    `SELECT id, ref_id, ref_label, rank, score, captured_at FROM ranking_history
      WHERE scope = $1 ORDER BY captured_at DESC LIMIT 100`,
    [scope],
  );
  res.json(rows);
});

/* ----------------------------------- subjects --------------------------------- */
router.get('/subjects', async (_req, res) => {
  const { rows } = await query('SELECT * FROM subjects ORDER BY title');
  res.json(rows);
});

router.post('/subjects', async (req, res) => {
  const { title, code, gradeLevel } = req.body || {};
  if (!title) return res.status(400).json({ error: 'عنوان درس الزامی است.' });
  const { rows } = await query(
    'INSERT INTO subjects (title, code, grade_level) VALUES ($1,$2,$3) RETURNING id',
    [title, code || null, gradeLevel || null],
  );
  await logActivity(req.user, 'ایجاد درس', 'subject', rows[0].id, { title });
  res.status(201).json({ id: rows[0].id });
});

router.patch('/subjects/:id', async (req, res) => {
  const { title, code, isActive } = req.body || {};
  await query(
    `UPDATE subjects SET title = COALESCE($1, title), code = COALESCE($2, code), is_active = COALESCE($3, is_active) WHERE id = $4`,
    [title || null, code ?? null, isActive ?? null, Number(req.params.id)],
  );
  res.json({ ok: true });
});

/* ------------------------------------ exams ----------------------------------- */
router.get('/exams', async (_req, res) => {
  const { rows } = await query(
    `SELECT e.*, c.name AS class_name, sub.title AS subject,
            (SELECT count(*)::int FROM grades g WHERE g.exam_id = e.id) AS graded_count,
            (SELECT count(*)::int FROM students s WHERE s.class_id = e.class_id) AS students_count
       FROM exams e JOIN classes c ON c.id = e.class_id
       LEFT JOIN subjects sub ON sub.id = e.subject_id
      ORDER BY e.exam_date DESC`,
  );
  res.json(rows);
});

router.post('/exams', async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.classId || !body.examDate) {
    return res.status(400).json({ error: 'عنوان، کلاس و تاریخ امتحان الزامی است.' });
  }
  const { rows } = await query(
    `INSERT INTO exams (title, subject_id, class_id, exam_date, start_time, duration_minutes, max_score, type, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      String(body.title).slice(0, 160),
      body.subjectId || null,
      Number(body.classId),
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

router.patch('/exams/:id', async (req, res) => {
  const body = req.body || {};
  const { rows } = await query(
    `UPDATE exams SET title = COALESCE($1, title), subject_id = COALESCE($2, subject_id),
       exam_date = COALESCE($3::date, exam_date), start_time = COALESCE($4, start_time),
       duration_minutes = COALESCE($5, duration_minutes), max_score = COALESCE($6, max_score),
       type = COALESCE($7, type), description = COALESCE($8, description)
     WHERE id = $9 RETURNING id`,
    [
      body.title || null,
      body.subjectId || null,
      body.examDate || null,
      body.startTime || null,
      body.durationMinutes || null,
      body.maxScore || null,
      body.type || null,
      body.description ?? null,
      Number(req.params.id),
    ],
  );
  if (!rows[0]) return res.status(404).json({ error: 'امتحان یافت نشد.' });
  await logActivity(req.user, 'ویرایش امتحان', 'exam', rows[0].id);
  res.json({ ok: true });
});

router.delete('/exams/:id', async (req, res) => {
  await query('DELETE FROM exams WHERE id = $1', [Number(req.params.id)]);
  await logActivity(req.user, 'حذف امتحان', 'exam', Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------ grades ---------------------------------- */
router.get('/grades', async (req, res) => {
  const examId = Number(req.query.examId);
  const { rows: examRows } = await query(
    `SELECT e.*, c.name AS class_name, sub.title AS subject FROM exams e
      JOIN classes c ON c.id = e.class_id LEFT JOIN subjects sub ON sub.id = e.subject_id WHERE e.id = $1`,
    [examId],
  );
  if (!examRows[0]) return res.status(404).json({ error: 'امتحان یافت نشد.' });
  const { rows } = await query(
    `SELECT s.id AS student_id, s.full_name, g.score, g.note, g.updated_at, u.username
       FROM students s LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN grades g ON g.student_id = s.id AND g.exam_id = $2
      WHERE s.class_id = $1 ORDER BY s.full_name`,
    [examRows[0].class_id, examId],
  );
  res.json({ exam: examRows[0], students: rows });
});

router.post('/grades', async (req, res) => {
  const examId = Number(req.body?.examId);
  const entries = Array.isArray(req.body?.grades) ? req.body.grades : [];
  const reason = String(req.body?.reason || '').trim() || 'ویرایش نمره توسط مدیر';
  const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [examId]);
  const exam = examRows[0];
  if (!exam) return res.status(404).json({ error: 'امتحان یافت نشد.' });
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
  if (!valid.length) return res.status(400).json({ error: 'نمره‌ای ارسال نشده است.' });
  let saved = 0;
  await withTransaction(async (client) => {
    for (const entry of valid) {
      const student = await client.query('SELECT id FROM students WHERE id = $1 AND class_id = $2', [
        entry.studentId,
        exam.class_id,
      ]);
      if (!student.rowCount) continue;
      const existing = await client.query('SELECT id, score FROM grades WHERE exam_id = $1 AND student_id = $2', [
        examId,
        entry.studentId,
      ]);
      if (existing.rowCount) {
        const old = existing.rows[0];
        if (Number(old.score) === entry.score) continue;
        await client.query('UPDATE grades SET score=$1, note=$2, updated_by=$3, updated_at=now() WHERE id=$4', [
          entry.score,
          entry.note,
          req.user.id,
          old.id,
        ]);
        await client.query(
          `INSERT INTO grade_history (grade_id, exam_id, student_id, old_score, new_score, reason, changed_by, changed_by_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [old.id, examId, entry.studentId, old.score, entry.score, reason, req.user.id, req.user.full_name],
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO grades (exam_id, student_id, score, note, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
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

router.get('/grades/history', async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.studentId) {
    params.push(Number(req.query.studentId));
    where = 'WHERE h.student_id = $1';
  }
  const { rows } = await query(
    `SELECT h.*, s.full_name AS student_name FROM grade_history h
      LEFT JOIN students s ON s.id = h.student_id ${where}
      ORDER BY h.changed_at DESC LIMIT 100`,
    params,
  );
  res.json(rows);
});

/* ------------------------------- announcements -------------------------------- */
router.get('/announcements', async (_req, res) => {
  const { rows } = await query(
    `SELECT a.*, c.name AS class_name, cp.name AS camp_name, cp.slot AS camp_slot
       FROM announcements a LEFT JOIN classes c ON c.id = a.class_id
       LEFT JOIN camps cp ON cp.id = a.camp_id
      ORDER BY a.created_at DESC LIMIT 200`,
  );
  res.json(rows);
});

router.post('/announcements', async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.body) return res.status(400).json({ error: 'عنوان و متن اطلاعیه الزامی است.' });
  const category = body.category || 'public';
  if (category === 'class' && !body.classId) return res.status(400).json({ error: 'انتخاب کلاس الزامی است.' });
  if (category === 'camp' && !body.campId) return res.status(400).json({ error: 'انتخاب قرارگاه الزامی است.' });
  const status = body.status === 'published' ? 'published' : 'draft';
  const audience = { public: 'all', class: 'class', camp: 'camp', teachers: 'teachers', admin: 'admin' }[category];
  const { rows } = await query(
    `INSERT INTO announcements (title, body, category, audience, class_id, camp_id, image_url, status, author_id, author_name, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,${status === 'published' ? 'now()' : 'NULL'}) RETURNING id`,
    [
      String(body.title).slice(0, 160),
      String(body.body),
      category,
      audience,
      category === 'class' ? Number(body.classId) : null,
      category === 'camp' ? Number(body.campId) : null,
      body.imageUrl || null,
      status,
      req.user.id,
      req.user.full_name,
    ],
  );
  await logActivity(req.user, 'ایجاد اطلاعیه', 'announcement', rows[0].id, { title: body.title });
  res.status(201).json({ id: rows[0].id });
});

router.patch('/announcements/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const { rows: current } = await query('SELECT * FROM announcements WHERE id = $1', [id]);
  if (!current[0]) return res.status(404).json({ error: 'اطلاعیه یافت نشد.' });
  const status = body.status || current[0].status;
  await query(
    `UPDATE announcements SET title = COALESCE($1,title), body = COALESCE($2,body), category = COALESCE($3,category),
       class_id = COALESCE($4,class_id), camp_id = COALESCE($5,camp_id), image_url = COALESCE($6,image_url),
       status = $7, published_at = CASE WHEN $7 = 'published' AND published_at IS NULL THEN now() ELSE published_at END
     WHERE id = $8`,
    [
      body.title || null,
      body.body || null,
      body.category || null,
      body.classId ? Number(body.classId) : null,
      body.campId ? Number(body.campId) : null,
      body.imageUrl ?? null,
      status,
      id,
    ],
  );
  await logActivity(req.user, 'ویرایش اطلاعیه', 'announcement', id, { status });
  res.json({ ok: true });
});

router.delete('/announcements/:id', async (req, res) => {
  await query('DELETE FROM announcements WHERE id = $1', [Number(req.params.id)]);
  await logActivity(req.user, 'حذف اطلاعیه', 'announcement', Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------ news ------------------------------------ */
router.get('/news', async (_req, res) => {
  const { rows } = await query('SELECT * FROM news ORDER BY created_at DESC LIMIT 200');
  res.json(rows);
});

router.post('/news', async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.body) return res.status(400).json({ error: 'عنوان و متن خبر الزامی است.' });
  const status = body.status === 'published' ? 'published' : 'draft';
  const { rows } = await query(
    `INSERT INTO news (title, excerpt, body, category, image_url, status, author_id, author_name, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${status === 'published' ? 'now()' : 'NULL'}) RETURNING id`,
    [
      String(body.title).slice(0, 180),
      body.excerpt || null,
      String(body.body),
      body.category || 'school',
      body.imageUrl || null,
      status,
      req.user.id,
      req.user.full_name,
    ],
  );
  await logActivity(req.user, 'ایجاد خبر', 'news', rows[0].id, { title: body.title });
  res.status(201).json({ id: rows[0].id });
});

router.patch('/news/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const { rows: current } = await query('SELECT status FROM news WHERE id = $1', [id]);
  if (!current[0]) return res.status(404).json({ error: 'خبر یافت نشد.' });
  const status = body.status || current[0].status;
  await query(
    `UPDATE news SET title = COALESCE($1,title), excerpt = COALESCE($2,excerpt), body = COALESCE($3,body),
       category = COALESCE($4,category), image_url = COALESCE($5,image_url), status = $6,
       published_at = CASE WHEN $6 = 'published' AND published_at IS NULL THEN now() ELSE published_at END
     WHERE id = $7`,
    [body.title || null, body.excerpt ?? null, body.body || null, body.category || null, body.imageUrl ?? null, status, id],
  );
  await logActivity(req.user, 'ویرایش خبر', 'news', id, { status });
  res.json({ ok: true });
});

router.delete('/news/:id', async (req, res) => {
  await query('DELETE FROM news WHERE id = $1', [Number(req.params.id)]);
  await logActivity(req.user, 'حذف خبر', 'news', Number(req.params.id));
  res.json({ ok: true });
});

/* ----------------------------------- honors ----------------------------------- */
router.get('/honors', async (_req, res) => {
  const { rows } = await query(
    `SELECT h.*, s.full_name AS student_name, c.name AS class_name, cp.name AS camp_name, cp.slot AS camp_slot
       FROM honors h LEFT JOIN students s ON s.id = h.student_id
       LEFT JOIN classes c ON c.id = h.class_id LEFT JOIN camps cp ON cp.id = h.camp_id
      ORDER BY h.awarded_on DESC NULLS LAST, h.id DESC`,
  );
  res.json(rows);
});

router.post('/honors', async (req, res) => {
  const body = req.body || {};
  if (!body.title) return res.status(400).json({ error: 'عنوان افتخار الزامی است.' });
  const { rows } = await query(
    `INSERT INTO honors (title, description, student_id, class_id, camp_id, level, awarded_on, image_url, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      String(body.title).slice(0, 180),
      body.description || null,
      body.studentId || null,
      body.classId || null,
      body.campId || null,
      body.level || null,
      body.awardedOn || null,
      body.imageUrl || null,
      req.user.id,
    ],
  );
  await logActivity(req.user, 'ثبت افتخار', 'honor', rows[0].id, { title: body.title });
  res.status(201).json({ id: rows[0].id });
});

router.patch('/honors/:id', async (req, res) => {
  const body = req.body || {};
  await query(
    `UPDATE honors SET title = COALESCE($1,title), description = COALESCE($2,description),
       student_id = COALESCE($3,student_id), class_id = COALESCE($4,class_id), camp_id = COALESCE($5,camp_id),
       level = COALESCE($6,level), awarded_on = COALESCE($7::date,awarded_on), image_url = COALESCE($8,image_url)
     WHERE id = $9`,
    [
      body.title || null,
      body.description ?? null,
      body.studentId || null,
      body.classId || null,
      body.campId || null,
      body.level ?? null,
      body.awardedOn || null,
      body.imageUrl ?? null,
      Number(req.params.id),
    ],
  );
  await logActivity(req.user, 'ویرایش افتخار', 'honor', Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/honors/:id', async (req, res) => {
  await query('DELETE FROM honors WHERE id = $1', [Number(req.params.id)]);
  await logActivity(req.user, 'حذف افتخار', 'honor', Number(req.params.id));
  res.json({ ok: true });
});

/* ---------------------------------- calendar ---------------------------------- */
router.get('/calendar', async (_req, res) => {
  const { rows } = await query(
    `SELECT e.*, c.name AS class_name FROM calendar_events e
     LEFT JOIN classes c ON c.id = e.class_id ORDER BY e.event_date DESC LIMIT 200`,
  );
  res.json(rows);
});

router.post('/calendar', async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.eventDate) return res.status(400).json({ error: 'عنوان و تاریخ رویداد الزامی است.' });
  const { rows } = await query(
    `INSERT INTO calendar_events (title, description, event_date, end_date, type, audience, class_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      String(body.title).slice(0, 180),
      body.description || null,
      body.eventDate,
      body.endDate || null,
      body.type || 'school',
      body.audience || 'all',
      body.audience === 'class' ? Number(body.classId) || null : null,
      req.user.id,
    ],
  );
  await logActivity(req.user, 'ایجاد رویداد تقویم', 'calendar', rows[0].id, { title: body.title });
  res.status(201).json({ id: rows[0].id });
});

router.patch('/calendar/:id', async (req, res) => {
  const body = req.body || {};
  await query(
    `UPDATE calendar_events SET title = COALESCE($1,title), description = COALESCE($2,description),
       event_date = COALESCE($3::date, event_date), end_date = COALESCE($4::date, end_date),
       type = COALESCE($5,type), audience = COALESCE($6,audience), class_id = COALESCE($7,class_id)
     WHERE id = $8`,
    [
      body.title || null,
      body.description ?? null,
      body.eventDate || null,
      body.endDate || null,
      body.type || null,
      body.audience || null,
      body.classId || null,
      Number(req.params.id),
    ],
  );
  await logActivity(req.user, 'ویرایش رویداد تقویم', 'calendar', Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/calendar/:id', async (req, res) => {
  await query('DELETE FROM calendar_events WHERE id = $1', [Number(req.params.id)]);
  await logActivity(req.user, 'حذف رویداد تقویم', 'calendar', Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------ users ----------------------------------- */
router.get('/users', async (req, res) => {
  const params = [];
  const conditions = [];
  if (req.query.role) {
    params.push(req.query.role);
    conditions.push(`role = $${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${String(req.query.search).trim()}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR username ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT id, username, email, full_name, role, is_active, password_hash IS NULL AS pending_activation,
            invite_expires_at, last_login_at, created_at
       FROM users ${where} ORDER BY role, full_name LIMIT 400`,
    params,
  );
  res.json(rows);
});

router.post('/users/:id/invite', async (req, res) => {
  const { rows } = await query('SELECT id FROM users WHERE id = $1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'کاربر یافت نشد.' });
  const invite = await createInvite(rows[0].id);
  await logActivity(req.user, 'صدور کد دعوت', 'user', rows[0].id);
  res.json(invite);
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  if (id === req.user.id && body.isActive === false) {
    return res.status(400).json({ error: 'غیرفعال کردن حساب خودتان مجاز نیست.' });
  }
  await query('UPDATE users SET is_active = COALESCE($1, is_active) WHERE id = $2', [
    body.isActive ?? null,
    id,
  ]);
  await logActivity(req.user, body.isActive === false ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی کاربر', 'user', id);
  res.json({ ok: true });
});

/* ----------------------------------- reports ---------------------------------- */
router.get('/reports', async (req, res) => {
  const params = [];
  const conditions = [];
  if (req.query.limit) {
    params.push(Math.min(Number(req.query.limit) || 100, 500));
  }
  const limit = params.length ? `$${params.length}` : '100';
  if (req.query.entity) {
    params.push(req.query.entity);
    conditions.push(`entity = $${params.length}`);
  }
  if (req.query.from) {
    params.push(req.query.from);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  const academic = await query(
    `SELECT c.name AS class_name, round(avg(g.score),2) AS average, count(g.id)::int AS graded
       FROM classes c LEFT JOIN exams e ON e.class_id = c.id LEFT JOIN grades g ON g.exam_id = e.id
      GROUP BY c.id, c.name ORDER BY c.code`,
  );
  res.json({ logs: rows, academic: academic.rows });
});

/* ---------------------------------- settings ---------------------------------- */
router.get('/settings', async (_req, res) => {
  res.json(await readSettings());
});

router.patch('/settings', async (req, res) => {
  const current = await readSettings();
  const body = req.body || {};
  const next = {
    ...current,
    ...body,
    contact: { ...current.contact, ...(body.contact || {}) },
    social: { ...current.social, ...(body.social || {}) },
  };
  await query('UPDATE school_settings SET data = $1, updated_at = now() WHERE id = 1', [JSON.stringify(next)]);
  await logActivity(req.user, 'ویرایش تنظیمات مدرسه', 'settings', 1);
  res.json(next);
});

router.get('/settings/lookups', async (_req, res) => {
  const [classes, camps, students] = await Promise.all([
    query('SELECT id, name, code FROM classes ORDER BY code'),
    query('SELECT id, slot, name FROM camps ORDER BY slot'),
    query(
      `SELECT s.id, s.full_name, c.name AS class_name FROM students s
        LEFT JOIN classes c ON c.id = s.class_id WHERE s.is_active ORDER BY s.full_name`,
    ),
  ]);
  res.json({ classes: classes.rows, camps: camps.rows, students: students.rows });
});

export default router;
