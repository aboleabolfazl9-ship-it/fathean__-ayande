import { query } from './db.js';

export async function studentTotals(client = null) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(`
    WITH totals AS (
      SELECT s.id, s.full_name, s.student_code, s.class_id, s.camp_id,
             COALESCE(SUM(t.amount), 0)::int AS total
        FROM students s
        LEFT JOIN jenm_transactions t ON t.student_id = s.id
       GROUP BY s.id
    )
    SELECT totals.*, RANK() OVER (ORDER BY total DESC, full_name ASC)::int AS rank
      FROM totals
  `);
  return rows;
}

export async function classTotals(client = null) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(`
    SELECT c.id, c.name, c.code, c.grade,
           count(s.id)::int AS students_count,
           COALESCE(SUM(COALESCE(t.total, 0)), 0)::int AS total
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      LEFT JOIN (
        SELECT student_id, SUM(amount)::int AS total FROM jenm_transactions GROUP BY student_id
      ) t ON t.student_id = s.id
     GROUP BY c.id
  `);
  const sorted = rows
    .map((r) => ({ ...r }))
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  return sorted.map((r) => ({ ...r, rank: 1 + sorted.filter((x) => x.total > r.total).length }));
}

export async function campTotals(client = null) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(`
    SELECT cp.id, cp.slot, cp.name, cp.color, cp.logo_url, cp.description, cp.is_active,
           count(s.id)::int AS students_count,
           COALESCE(SUM(COALESCE(t.total, 0)), 0)::int AS total
      FROM camps cp
      LEFT JOIN students s ON s.camp_id = cp.id
      LEFT JOIN (
        SELECT student_id, SUM(amount)::int AS total FROM jenm_transactions GROUP BY student_id
      ) t ON t.student_id = s.id
     GROUP BY cp.id
  `);
  const sorted = rows.map((r) => ({ ...r })).sort((a, b) => b.total - a.total || a.slot - b.slot);
  return sorted.map((r) => ({ ...r, rank: 1 + sorted.filter((x) => x.total > r.total).length }));
}

export async function snapshotRankings(client, changedStudentId) {
  const students = await studentTotals(client);
  const me = students.find((s) => s.id === changedStudentId);
  if (me) {
    await client.query(
      `INSERT INTO ranking_history (scope, ref_id, ref_label, rank, score) VALUES ('student',$1,$2,$3,$4)`,
      [me.id, me.full_name, me.rank, me.total],
    );
  }
  const classRows = await classTotals(client);
  for (const c of classRows) {
    await client.query(
      `INSERT INTO ranking_history (scope, ref_id, ref_label, rank, score) VALUES ('class',$1,$2,$3,$4)`,
      [c.id, c.name, c.rank, c.total],
    );
  }
  const campRows = await campTotals(client);
  for (const c of campRows) {
    await client.query(
      `INSERT INTO ranking_history (scope, ref_id, ref_label, rank, score) VALUES ('camp',$1,$2,$3,$4)`,
      [c.id, c.name || `قرارگاه ${c.slot}`, c.rank, c.total],
    );
  }
}

export async function studentCard(studentId) {
  const students = await studentTotals();
  return students.find((s) => s.id === studentId) || null;
}
