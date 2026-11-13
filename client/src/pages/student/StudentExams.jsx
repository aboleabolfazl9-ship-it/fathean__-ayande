import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faDate, faNum, faScore } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Pill } from '../../components/ui/Feedback';

const TYPE = { quiz: 'آزمونک', midterm: 'میان‌ترم', final: 'پایان‌ترم', makeup: 'جبرانی' };

export default function StudentExams() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/exams').then(setItems).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!items) return <Spinner />;

  const today = new Date(new Date().toDateString());
  const upcoming = items.filter((exam) => new Date(exam.exam_date) >= today).reverse();
  const past = items.filter((exam) => new Date(exam.exam_date) < today);

  const columns = [
    { key: 'title', header: 'عنوان', render: (row) => row.title },
    { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
    { key: 'date', header: 'تاریخ', render: (row) => faDate(row.exam_date) },
    { key: 'type', header: 'نوع', render: (row) => <Pill tone="gray">{TYPE[row.type] || row.type}</Pill> },
    {
      key: 'score',
      header: 'نمره',
      render: (row) => (row.score === null ? <span className="muted">ثبت نشده</span> : <b className="num">{faScore(row.score)}</b>),
    },
  ];

  return (
    <>
      <SectionCard title="امتحانات آینده">
        {upcoming.length === 0 ? (
          <EmptyState title="امتحان آینده‌ای ثبت نشده است" description="زمان‌بندی آزمون‌ها پس از ثبت توسط مدرسه نمایش داده می‌شود." />
        ) : (
          <DataTable columns={columns} rows={upcoming} />
        )}
      </SectionCard>

      <SectionCard title="امتحانات برگزارشده">
        {past.length === 0 ? <EmptyState title="سابقه امتحانی وجود ندارد" /> : <DataTable columns={columns} rows={past} />}
      </SectionCard>
    </>
  );
}
