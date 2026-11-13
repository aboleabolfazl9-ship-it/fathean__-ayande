import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardList, Megaphone, School, Users } from 'lucide-react';
import { api } from '../../api';
import { faDate, faNum, PERMISSION_LABELS } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';

export default function TeacherOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/teacher/overview').then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  const granted = Object.entries(data.permissions || {}).filter(([, value]) => value);

  return (
    <>
      <div className="card card-pad" style={{ background: 'linear-gradient(120deg, var(--navy-900), var(--navy-700))', color: '#fff' }}>
        <div className="between">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>پنل معلم</span>
            <h2 style={{ fontSize: 21, marginTop: 6 }}>{data.teacher.fullName}</h2>
            <p className="small" style={{ color: 'rgba(255,255,255,.7)' }}>{data.teacher.field || 'درس تخصصی ثبت نشده است'}</p>
          </div>
          <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
            {granted.length ? (
              granted.map(([key]) => (
                <span key={key} className="pill" style={{ background: 'rgba(198,166,98,.18)', color: 'var(--gold-300)' }}>
                  {PERMISSION_LABELS[key] || key}
                </span>
              ))
            ) : (
              <span className="pill pill-gray">مجوز خاصی تعیین نشده است</span>
            )}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="کلاس‌های اختصاص‌یافته" value={faNum(data.classes.length)} icon={School} />
        <StatCard label="دانش‌آموزان مجاز" value={faNum(data.studentsCount)} icon={Users} />
        <StatCard label="امتحانات آینده" value={faNum(data.upcomingExams.length)} icon={CalendarClock} />
        <StatCard label="نمرات اخیر" value={faNum(data.recentGrades.length)} icon={ClipboardList} />
      </div>

      <div className="grid-2">
        <SectionCard title="کلاس‌های من">
          {data.classes.length === 0 ? (
            <EmptyState title="کلاسی به شما اختصاص داده نشده است" description="مدیر مدرسه می‌تواند کلاس‌های مجاز را برای شما تعیین کند." />
          ) : (
            <div className="stack gap-8">
              {data.classes.map((cls) => (
                <div key={cls.id} className="list-row">
                  <span className="grow">
                    <strong>{cls.name}</strong>
                    <span>{faNum(cls.students_count)} دانش‌آموز</span>
                  </span>
                  <Link className="link-arrow" to="/teacher/students">
                    دانش‌آموزان ←
                  </Link>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="امتحانات آینده">
          {data.upcomingExams.length === 0 ? (
            <EmptyState title="امتحانی در پیش نیست" />
          ) : (
            <div className="timeline">
              {data.upcomingExams.map((exam) => (
                <div className="timeline-item" key={exam.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{exam.title}</strong>
                    <span>{exam.class_name} · {faDate(exam.exam_date)}</span>
                  </div>
                  <Pill tone="blue">{exam.subject || 'بدون درس'}</Pill>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid-2">
        <SectionCard title="فعالیت‌های آموزشی اخیر">
          {data.recentGrades.length === 0 ? (
            <EmptyState title="فعالیتی ثبت نشده است" />
          ) : (
            <div className="timeline">
              {data.recentGrades.map((row) => (
                <div className="timeline-item" key={row.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{row.full_name} — {row.exam_title}</strong>
                    <span>نمره {row.score} · {faDate(row.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="اطلاعیه‌های جدید">
          {data.announcements.length === 0 ? (
            <EmptyState title="اطلاعیه‌ای وجود ندارد" icon={Megaphone} />
          ) : (
            <div className="timeline">
              {data.announcements.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{item.title}</strong>
                    <span>{faDate(item.published_at)}</span>
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
