import { waitForDatabase, query, withTransaction, pool } from '../db.js';
import { CLASSES, ROSTER } from '../seed/students.js';
import { hashPassword } from '../auth.js';

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
  contact: { phone: '', email: '', address: '', mapUrl: '', officeHours: '' },
  social: { instagram: '', telegram: '', whatsapp: '', aparat: '' },
  academicYear: '۱۴۰۴-۱۴۰۵',
  copyright: 'تمامی حقوق برای مدرسه فاتحان آینده محفوظ است.',
};

async function main() {
  await waitForDatabase();

  await withTransaction(async (client) => {
    // 1) classes — five official classes
    for (const c of CLASSES) {
      await client.query(
        `INSERT INTO classes (code, grade, grade_level, section, name)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (code) DO NOTHING`,
        [c.code, c.grade, c.grade_level, c.section, c.name],
      );
      await client.query(
        `UPDATE classes SET grade=$2, grade_level=$3, section=$4 WHERE code=$1`,
        [c.code, c.grade, c.grade_level, c.section],
      );
    }

    // 2) camps — exactly five, official names intentionally unset
    for (let slot = 1; slot <= 5; slot += 1) {
      await client.query(
        `INSERT INTO camps (slot, name, color, description)
         VALUES ($1, NULL, $2, NULL)
         ON CONFLICT (slot) DO NOTHING`,
        [slot, ['#C6A662', '#1E3A5F', '#4F7C6A', '#8C5B52', '#5B6B8C'][slot - 1]],
      );
    }

    // 3) admin account
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Fatehan@1404';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fatehan.school';
    const adminName = process.env.ADMIN_NAME || 'مدیر مدرسه';
    const existingAdmin = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (existingAdmin.rowCount === 0) {
      const passHash = await hashPassword(adminPassword);
      await client.query(
        `INSERT INTO users (username, email, full_name, role, password_hash, must_change_password, permissions)
         VALUES ($1,$2,$3,'admin',$4,true,'{"all":true}'::jsonb)
         ON CONFLICT (username) DO NOTHING`,
        [adminUsername, adminEmail, adminName, passHash],
      );
      console.log('[seed] admin account created');
    } else {
      console.log('[seed] admin account already exists');
    }

    // 4) students + their own accounts (invite-based, no shared password)
    const classRows = await client.query('SELECT id, code FROM classes');
    const classByCode = new Map(classRows.rows.map((r) => [r.code, r.id]));
    let created = 0;
    for (const [code, names] of Object.entries(ROSTER)) {
      const classId = classByCode.get(code);
      for (let i = 0; i < names.length; i += 1) {
        const fullName = names[i];
        const studentCode = `F${code.replace('/', '')}-${String(i + 1).padStart(2, '0')}`;
        const username = studentCode.toLowerCase();
        const existing = await client.query(
          'SELECT id FROM students WHERE full_name = $1 AND class_id = $2',
          [fullName, classId],
        );
        if (existing.rowCount > 0) continue;
        const userRes = await client.query(
          `INSERT INTO users (username, full_name, role, password_hash, must_change_password)
           VALUES ($1,$2,'student',NULL,true)
           ON CONFLICT (username) DO NOTHING
           RETURNING id`,
          [username, fullName],
        );
        let userId = userRes.rows[0]?.id;
        if (!userId) {
          const found = await client.query('SELECT id FROM users WHERE username = $1', [username]);
          userId = found.rows[0].id;
        }
        await client.query(
          `INSERT INTO students (user_id, student_code, full_name, class_id)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (student_code) DO NOTHING`,
          [userId, studentCode, fullName, classId],
        );
        created += 1;
      }
    }
    console.log(`[seed] students created: ${created}`);

    // 5) school settings (only if empty, so admin edits survive)
    const settings = await client.query('SELECT id FROM school_settings WHERE id = 1');
    if (settings.rowCount === 0) {
      await client.query('INSERT INTO school_settings (id, data) VALUES (1, $1)', [
        JSON.stringify(DEFAULT_SETTINGS),
      ]);
    }

    // 6) make sure every student has a camp slot-less assignment left to the admin
  });

  const counts = await query(`
    SELECT
      (SELECT count(*)::int FROM students) AS students,
      (SELECT count(*)::int FROM classes) AS classes,
      (SELECT count(*)::int FROM camps) AS camps,
      (SELECT count(*)::int FROM users WHERE role='student') AS student_users
  `);
  console.log('[seed] counts', counts.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
