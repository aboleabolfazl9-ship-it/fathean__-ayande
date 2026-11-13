import { query } from './db.js';
import { studentCard, classTotals, campTotals, studentTotals } from './rankings.js';

export async function studentContext(userId) {
  const { rows } = await query(
    `SELECT s.*, c.name AS class_name, c.code AS class_code, c.grade, c.grade_level,
            cp.name AS camp_name, cp.slot AS camp_slot, cp.color AS camp_color,
            u.username, u.email, u.phone AS user_phone, u.last_login_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN camps cp ON cp.id = s.camp_id
      WHERE s.user_id = $1`,
    [userId],
  );
  return rows[0] || null;
}

export async function studentAnnouncements(student) {
  return (
    await query(
      `SELECT id, title, body, category, image_url, published_at
         FROM announcements
        WHERE status = 'published'
          AND (category = 'public'
               OR (category = 'class' AND class_id = $1)
               OR (category = 'camp' AND camp_id = $2))
        ORDER BY published_at DESC NULLS LAST LIMIT 50`,
      [student.class_id, student.camp_id],
    )
  ).rows;
}

export async function studentCalendar(student) {
  return (
    await query(
      `SELECT id, title, description, event_date, end_date, type
         FROM calendar_events
        WHERE audience IN ('all','students') OR (audience = 'class' AND class_id = $1)
        ORDER BY event_date ASC LIMIT 60`,
      [student.class_id],
    )
  ).rows;
}

export async function studentExams(student) {
  const { rows } = await query(
    `SELECT e.id, e.title, e.exam_date, e.start_time, e.duration_minutes, e.type,
            e.max_score, sub.title AS subject,
            g.score, g.updated_at
       FROM exams e
       LEFT JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN grades g ON g.exam_id = e.id AND g.student_id = $2
      WHERE e.class_id = $1
      ORDER BY e.exam_date DESC`,
    [student.class_id, student.id],
  );
  return rows;
}

export async function studentGrades(student) {
  return (
    await query(
      `SELECT g.id, g.score, g.note, g.updated_at, e.title AS exam_title, e.exam_date,
              e.max_score, e.type, sub.title AS subject
         FROM grades g
         JOIN exams e ON e.id = g.exam_id
         LEFT JOIN subjects sub ON sub.id = e.subject_id
        WHERE g.student_id = $1
        ORDER BY e.exam_date DESC`,
      [student.id],
    )
  ).rows;
}

export async function studentHonors(studentId) {
  return (
    await query(
      `SELECT id, title, description, level, awarded_on FROM honors
        WHERE student_id = $1 ORDER BY awarded_on DESC NULLS LAST LIMIT 20`,
      [studentId],
    )
  ).rows;
}

export async function studentRanking(student) {
  const [students, classes, camps] = await Promise.all([
    studentTotals(),
    classTotals(),
    campTotals(),
  ]);
  const mine = students.find((s) => s.id === student.id);
  const classmates = students.filter((s) => s.class_id === student.class_id).sort((a, b) => b.total - a.total);
  return {
    rank: mine?.rank ?? null,
    total: mine?.total ?? 0,
    of: students.length,
    classRank: classes.find((c) => c.id === student.class_id) || null,
    campRank: camps.find((c) => c.id === student.camp_id) || null,
    classmates: classmates.map((s) => ({ id: s.id, fullName: s.full_name, total: s.total })),
    top: students.sort((a, b) => a.rank - b.rank).slice(0, 10),
  };
}
