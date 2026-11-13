import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, CalendarClock, Flag, GraduationCap, Sparkles, Users, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { faDateTime, faDate, faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/overview').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="stat-grid">
        <StatCard label="دانش‌آموزان" value={faNum(data.students)} icon={Users} foot="حساب فعال" />
        <StatCard label="معلمان" value={faNum(data.teachers)} icon={GraduationCap} foot="حساب فعال" />
        <StatCard label="کلاس‌ها" value={faNum(data.classes)} icon={Building2} />
        <StatCard label="قرارگاه‌ها" value={faNum(data.camps)} icon={Flag} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <StatCard label="مجموع جنم مدرسه" value={faNum(data.jenmTotal)} icon={Sparkles} foot="از تراکنش‌های ثبت‌شده" />
        <StatCard label="در انتظار بررسی" value={faNum(data.pending.total)} icon={AlertTriangle} foot="پیش‌نویس و موارد ناقص" />
        <StatCard label="امتحانات آینده" value={faNum(data.upcomingExams.length)} icon={CalendarClock} />
        <StatCard label="فعالیت‌های اخیر" value={faNum(data.recentActivity.length)} icon={Activity} />
      </div>

      {data.pending.students_without_camp > 0 ? (
        <div className="alert alert-warn">
          {faNum(data.pending.students_without_camp)} دانش‌آموز هنوز به قرارگاه اختصاص نیافته‌اند.{' '}
          <Link to="/admin/camps" style={{ fontWeight: 700 }}>
            مدیریت قرارگاه‌ها
          </Link>
        </div>
      ) : null}

      <div className="grid-2">
        <SectionCard
          title="امتحانات آینده"
          action={<Link className="link-arrow" to="/admin/exams">مدیریت امتحانات ←</Link>}
        >
          {data.upcomingExams.length === 0 ? (
            <EmptyState title="امتحانی ثبت نشده است" description="با ایجاد امتحان برای هر کلاس، زمان‌بندی در تقویم و پنل دانش‌آموزان نمایش داده می‌شود." />
          ) : (
            <div className="timeline">
              {data.upcomingExams.map((exam) => (
                <div className="timeline-item" key={exam.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{exam.title}</strong>
                    <span>{exam.class_name} · {faDate(exam.exam_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="آخرین فعالیت‌ها"
          action={<Link className="link-arrow" to="/admin/reports">همه گزارش‌ها ←</Link>}
        >
          {data.recentActivity.length === 0 ? (
            <EmptyState title="فعالیتی ثبت نشده است" icon={Activity} />
          ) : (
            <div className="timeline">
              {data.recentActivity.map((log) => (
                <div className="timeline-item" key={log.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{log.action}</strong>
                    <span>{log.actor_name} · {faDateTime(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid-3">
        <div className="card card-pad">
          <Pill tone="amber">پیش‌نویس اطلاعیه</Pill>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }} className="num">{faNum(data.pending.draft_announcements)}</div>
          <Link className="link-arrow" to="/admin/announcements">بررسی اطلاعیه‌ها ←</Link>
        </div>
        <div className="card card-pad">
          <Pill tone="amber">پیش‌نویس خبر</Pill>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }} className="num">{faNum(data.pending.draft_news)}</div>
          <Link className="link-arrow" to="/admin/news">بررسی اخبار ←</Link>
        </div>
        <div className="card card-pad">
          <Pill tone="blue">امتحان بدون نمره</Pill>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }} className="num">{faNum(data.pending.exams_without_grades)}</div>
          <Link className="link-arrow" to="/admin/grades">ثبت نمرات ←</Link>
        </div>
      </div>
    </>
  );
}
