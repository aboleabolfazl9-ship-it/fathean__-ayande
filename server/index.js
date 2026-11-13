import express from 'express';
import cookieParser from 'cookie-parser';
import { pool, waitForDatabase } from './db.js';
import { loadUser } from './auth.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import studentRoutes from './routes/student.js';
import teacherRoutes from './routes/teacher.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'api', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'مسیر مورد نظر یافت نشد.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api] error', err);
  res.status(500).json({ error: 'خطای سرور. لطفاً دوباره تلاش کنید.' });
});

async function start() {
  await waitForDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
