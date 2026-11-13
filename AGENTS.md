# مدرسه فاتحان آینده — School Management System

Fullstack school platform: public website + separate panels for مدرس(admin), معلم(teacher) and
دانش‌آموز(student). Persian/RTL UI, real PostgreSQL data, cookie-session authentication with
server-side role checks.

## Stack

- `server/` — Express 4 (ESM) API on port 8000, PostgreSQL via `pg`.
- `client/` — React 18 + Vite 5 SPA on port 3000. Vite proxies `/api` to the `api` service, so the
  browser only talks to one origin (session cookies work without CORS workarounds).
- Database schema: `server/migrations/001_init.sql` (idempotent, applied on every boot).
- Seed: `server/scripts/seed.js` (idempotent; safe to re-run).

## Run

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Services: `db` (postgres:16-alpine), `migrate` + `seed` (one-shot), `api` (`node --watch`),
`web` (`vite`). Source is bind-mounted, so edits hot-reload (Vite) or restart the API watcher.

- App: http://localhost:3000
- API: http://localhost:8000/api/health

## Credentials

- Initial admin account is created by the seed from `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  (development defaults in `.env.base44-defaults`: `admin` / `Fatehan@1404`).
  **Change it after first login from «تنظیمات حساب»** — the seeded admin is flagged
  `must_change_password`.
- Students and teachers never get a shared or preset password. The admin issues a one-time
  invite code (8 chars, hashed in the DB, 7-day expiry) from «مدیریت دانش‌آموزان» /
  «مدیریت معلمان»; the user redeems it on `/login?tab=register` and chooses their own password.
  Codes are shown once, so copy them immediately.

## Data rules (do not break)

- Exactly 86 students in 5 classes (7/1: 20, 8/1: 21, 8/2: 18, 9/1: 11, 9/2: 16). Names must stay
  exactly as seeded (`server/seed/students.js`).
- Exactly 5 camp records; their official names are intentionally `NULL` until the admin sets
  them. Placeholder labels («قرارگاه ۱…۵») are generated in the UI, never stored.
- All jenm scores start at 0. No grades, exams, announcements, news, honors or events are seeded.
- Seeding twice creates no duplicates (`ON CONFLICT` on class code, camp slot, username,
  student code and `(full_name, class_id)`).

## Access model

- `admin` — everything under `/api/admin/*`.
- `teacher` — only assigned classes (`teacher_assignments`); per-teacher permission flags
  (`can_grade`, `can_exams`, `can_jenm`, `can_announce`, `can_view_reports`) chosen by the admin.
- `student` — own profile (contact fields only), own grades/exams/honors, announcements for
  public/own class/own camp. Cannot read another student's private data or change jenm/grades.
- Every permission is enforced in the API middleware (`server/auth.js`), not just in the UI.
- Jenm history is append-only: corrections create a reversing transaction with a reason instead of
  deleting rows. Grade edits write to `grade_history`.

## Verification

```bash
# API health
curl -s localhost:8000/api/health

# seed integrity
docker compose -f docker-compose.base44.yml exec -T db \
  psql -U school -d school -c "select c.code, count(s.id) from classes c left join students s on s.class_id=c.id group by c.code order by c.code;"
```

Manual smoke test: log in as admin → dashboard shows real counts → add a jenm transaction for a
student → ranking updates → issue an invite for a student → redeem it → student panel opens with
0 jenm and no grades.

## Notes

- `index[1].html` is the original uploaded prototype; it is not served by this app.
- `JWT_SECRET` is injected from the platform secret store (`/run/base44/app.env`, listed last in
  each service's `env_file`). Never put it in a repo file.
- `.env.base44-defaults` holds local placeholders only; real secrets override it at runtime.
