import { useEffect, useState } from 'react';
import { School, Trophy, Users } from 'lucide-react';
import { api } from '../../api';
import { faDate, faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function StudentClass() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/class').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard label="کلاس" value={data.classCode} icon={School} foot={data.grade} />
        <StatCard label="تعداد دانش‌آموزان" value={faNum(data.classmates.length)} icon={Users} />
        <StatCard
          label="رتبه کلاس"
          value={faNum(data.classRank?.rank || '—')}
          icon={Trophy}
          foot={`مجموع جنم: ${faNum(data.classRank?.total || 0)}`}
        />
      </div>

      <SectionCard title="هم‌کلاسی‌های من">
        <DataTable
          columns={[
            { key: 'name', header: 'نام دانش‌آموز', render: (row) => row.full_name },
            { key: 'code', header: 'کد', render: (row) => <span className="ltr tiny">{row.student_code}</span> },
            { key: 'total', header: 'امتیاز جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
          ]}
          rows={data.classmates}
          emptyTitle="دانش‌آموزی در این کلاس نیست"
        />
      </SectionCard>

      <div className="grid-2">
        <SectionCard title="اطلاعیه‌های کلاس">
          {data.announcements.length === 0 ? (
            <EmptyState title="اطلاعیه‌ای منتشر نشده است" />
          ) : (
            <div className="timeline">
              {data.announcements.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{item.title}</strong>
                    <p className="small muted">{item.body}</p>
                    <span>{faDate(item.published_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="امتحانات پیش‌رو">
          {data.upcomingExams.length === 0 ? (
            <EmptyState title="امتحانی ثبت نشده است" />
          ) : (
            <div className="timeline">
              {data.upcomingExams.map((exam) => (
                <div className="timeline-item" key={exam.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{exam.title}</strong>
                    <span>{exam.subject ? `${exam.subject} · ` : ''}{faDate(exam.exam_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
