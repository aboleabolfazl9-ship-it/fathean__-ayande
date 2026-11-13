-- School management system schema (idempotent)
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  grade TEXT NOT NULL,
  grade_level INT NOT NULL,
  section INT NOT NULL,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '۱۴۰۴-۱۴۰۵',
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camps (
  id SERIAL PRIMARY KEY,
  slot INT UNIQUE NOT NULL,
  name TEXT,
  color TEXT NOT NULL DEFAULT '#C6A662',
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  phone TEXT,
  password_hash TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invite_code_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  class_id INT REFERENCES classes(id) ON DELETE SET NULL,
  camp_id INT REFERENCES camps(id) ON DELETE SET NULL,
  guardian_name TEXT,
  guardian_phone TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (full_name, class_id)
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  field TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT,
  grade_level INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jenm_transactions (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('add','subtract','adjust')),
  reason TEXT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TEXT,
  duration_minutes INT DEFAULT 90,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 20,
  type TEXT NOT NULL DEFAULT 'midterm' CHECK (type IN ('quiz','midterm','final','makeup')),
  description TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  note TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS grade_history (
  id SERIAL PRIMARY KEY,
  grade_id INT REFERENCES grades(id) ON DELETE CASCADE,
  exam_id INT,
  student_id INT,
  old_score NUMERIC(5,2),
  new_score NUMERIC(5,2),
  reason TEXT,
  changed_by INT REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'public' CHECK (category IN ('public','class','camp','teachers','admin')),
  audience TEXT NOT NULL DEFAULT 'all',
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  camp_id INT REFERENCES camps(id) ON DELETE CASCADE,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'school' CHECK (category IN ('school','events','competitions','honors','general')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS honors (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  student_id INT REFERENCES students(id) ON DELETE SET NULL,
  class_id INT REFERENCES classes(id) ON DELETE SET NULL,
  camp_id INT REFERENCES camps(id) ON DELETE SET NULL,
  level TEXT,
  awarded_on DATE,
  image_url TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  type TEXT NOT NULL DEFAULT 'school' CHECK (type IN ('exam','school','deadline','class','event')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','teachers','admin','class')),
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ranking_history (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  ref_id INT,
  ref_label TEXT,
  rank INT NOT NULL,
  score INT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_camp ON students(camp_id);
CREATE INDEX IF NOT EXISTS idx_jenm_student ON jenm_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_ann_class ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_ann_camp ON announcements(camp_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
