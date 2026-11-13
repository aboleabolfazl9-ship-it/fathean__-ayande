import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../api';
import { faDateTime, faNum, faScore } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

const ENTITIES = [
  { value: '', label: 'همه بخش‌ها' },
  { value: 'student', label: 'دانش‌آموزان' },
  { value: 'teacher', label: 'معلمان' },
  { value: 'jenm', label: 'جنم' },
  { value: 'exam', label: 'امتحانات' },
  { value: 'announcement', label: 'اطلاعیه‌ها' },
  { value: 'news', label: 'اخبار' },
  { value: 'honor', label: 'افتخارات' },
  { value: 'calendar', label: 'تقویم' },
  { value: 'settings', label: 'تنظیمات' },
  { value: 'auth', label: 'احراز هویت' },
];

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ entity: '', from: '', to: '' });
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('limit', '200');
    api(`/admin/reports?${params.toString()}`).then(setData).catch((err) => setError(err.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters]);

  const exportCsv = () => {
    if (!data?.logs?.length) return;
    const header = ['تاریخ', 'کاربر', 'نقش', 'عملیات', 'بخش'];
    const lines = data.logs.map((log) => [
      new Date(log.created_at).toISOString(),
      log.actor_name || '',
      log.actor_role || '',
      log.action,
      log.entity || '',
    ]);
    const csv = [header, ...lines].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activity-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <SectionCard title="خلاصه عملکرد تحصیلی کلاس‌ها">
        <DataTable
          columns={[
            { key: 'class', header: 'کلاس', render: (row) => row.class_name },
            { key: 'average', header: 'میانگین نمرات', render: (row) => (row.average === null ? <span className="muted">—</span> : <b className="num">{faScore(row.average)}</b>) },
            { key: 'graded', header: 'تعداد نمره ثبت‌شده', render: (row) => <span className="num">{faNum(row.graded)}</span> },
          ]}
          rows={data.academic}
          emptyTitle="نمره‌ای ثبت نشده است"
        />
      </SectionCard>

      <SectionCard
        title="گزارش فعالیت‌های سامانه"
        action={
          <div className="toolbar">
            <select value={filters.entity} onChange={(e) => setFilters({ ...filters, entity: e.target.value })} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر بخش">
              {ENTITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} style={{ padding: '6px 9px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="از تاریخ" />
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} style={{ padding: '6px 9px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="تا تاریخ" />
            <Button variant="ghost" size="sm" onClick={exportCsv} disabled={!data.logs.length}><Download /> خروجی CSV</Button>
          </div>
        }
      >
        {data.logs.length === 0 ? (
          <EmptyState title="فعالیتی ثبت نشده است" description="تمام عملیات مدیریتی و آموزشی به‌صورت خودکار در گزارش فعالیت‌ها ثبت می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'action', header: 'عملیات', render: (row) => row.action },
              { key: 'actor', header: 'کاربر', render: (row) => <span className="small">{row.actor_name} <span className="tiny muted">({row.actor_role === 'admin' ? 'مدیر' : row.actor_role === 'teacher' ? 'معلم' : row.actor_role === 'student' ? 'دانش‌آموز' : 'سیستم'})</span></span> },
              { key: 'entity', header: 'بخش', render: (row) => ENTITIES.find((e) => e.value === row.entity)?.label || row.entity || '—' },
              { key: 'date', header: 'زمان', render: (row) => <span className="tiny">{faDateTime(row.created_at)}</span> },
            ]}
            rows={data.logs}
          />
        )}
      </SectionCard>
    </>
  );
}
