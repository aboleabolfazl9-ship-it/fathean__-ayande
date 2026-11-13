import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faDate, faScore } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function StudentGrades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/grades').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="card card-pad between">
        <div>
          <span className="eyebrow">کارنامه</span>
          <h2 style={{ fontSize: 19, color: 'var(--navy-800)', marginTop: 6 }}>نمرات ثبت‌شده</h2>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy-800)' }} className="num">
            {data.average === null ? '—' : faScore(data.average)}
          </div>
          <span className="tiny muted">میانگین نمرات</span>
        </div>
      </div>

      <SectionCard title="فهرست نمرات">
        {data.grades.length === 0 ? (
          <EmptyState title="نمره‌ای ثبت نشده است" description="نمرات پس از ثبت توسط معلمان در این بخش نمایش داده می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
              { key: 'exam', header: 'آزمون', render: (row) => row.exam_title },
              { key: 'score', header: 'نمره', render: (row) => <b className="num">{faScore(row.score)}</b> },
              { key: 'max', header: 'از', render: (row) => <span className="num muted">{faScore(row.max_score)}</span> },
              { key: 'date', header: 'تاریخ آزمون', render: (row) => faDate(row.exam_date) },
            ]}
            rows={data.grades}
          />
        )}
      </SectionCard>
      <div className="alert alert-info">ویرایش نمرات فقط توسط معلمان مجاز و مدیر مدرسه امکان‌پذیر است و هر تغییر در تاریخچه ثبت می‌شود.</div>
    </>
  );
}
