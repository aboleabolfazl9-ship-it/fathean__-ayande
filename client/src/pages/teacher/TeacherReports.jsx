import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faNum, faScore } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function TeacherReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/teacher/reports').then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <SectionCard title="گزارش عملکرد آموزشی کلاس‌ها">
      {data.classes.length === 0 ? (
        <EmptyState title="گزارشی برای نمایش وجود ندارد" description="پس از ثبت نمرات، میانگین و آمار کلاس‌ها در این بخش محاسبه می‌شود." />
      ) : (
        <DataTable
          columns={[
            { key: 'class', header: 'کلاس', render: (row) => row.name },
            { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
            { key: 'average', header: 'میانگین', render: (row) => (row.average === null ? <span className="muted">—</span> : <b className="num">{faScore(row.average)}</b>) },
            { key: 'graded', header: 'تعداد نمره', render: (row) => <span className="num">{faNum(row.graded)}</span> },
            { key: 'range', header: 'بیشترین/کمترین', render: (row) => <span className="num">{row.max_score === null ? '—' : `${faScore(row.max_score)} / ${faScore(row.min_score)}`}</span> },
          ]}
          rows={data.classes}
        />
      )}
    </SectionCard>
  );
}
