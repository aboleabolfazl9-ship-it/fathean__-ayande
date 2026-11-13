import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarClock, ClipboardList, Flag, Megaphone, School, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../../api';
import { faDate, faNum, faScore } from '../../utils';
import { Spinner, EmptyState, Alert } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function StudentOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/overview').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  const { student } = data;

  return (
    <>
      <div className="card card-pad" style={{ background: 'linear-gradient(120deg, var(--navy-900), var(--navy-700))', color: '#fff' }}>
        <div className="between">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>خوش آمدید</span>
            <h2 style={{ fontSize: 22, marginTop: 6 }}>{student.fullName}</h2>
            <p className="small" style={{ color: 'rgba(255,255,255,.72)', marginTop: 4 }}>
              {student.className} · {student.campName || 'قرارگاه هنوز تعیین نشده است'}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--gold-300)' }} className="num">
              {faNum(data.rank || '—')}
            </div>
            <span className="tiny" style={{ color: 'rgba(255,255,255,.65)' }}>رتبه از {faNum(data.outOf)} دانش‌آموز</span>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="مجموع امتیاز جنم" value={faNum(data.jenmTotal)} icon={Sparkles} foot="از پایگاه داده" />
        <StatCard label="رتبه فعلی" value={faNum(data.rank || '—')} icon={TrendingUp} foot={`از ${faNum(data.outOf)} نفر`} />
        <StatCard label="میانگین نمرات" value={data.average === null ? '—' : faScore(data.average)} icon={ClipboardList} foot="میانگین ثبت‌شده" />
        <StatCard label="کلاس" value={student.classCode} icon={School} foot={student.grade} />
      </div>

      <div className="grid-2">
        <SectionCard
          title="آخرین نمرات"
          action={<Link className="link-arrow" to="/student/grades">همه نمرات ←</Link>}
        >
          {data.latestGrades.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="نمره‌ای ثبت نشده است"
              description="پس از ثبت نمرات توسط معلمان، در این بخش نمایش داده می‌شود."
            />
          ) : (
            <DataTable
              columns={[
                { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
                { key: 'exam', header: 'آزمون', render: (row) => row.exam_title },
                { key: 'score', header: 'نمره', render: (row) => <b className="num">{faScore(row.score)}</b> },
                { key: 'date', header: 'تاریخ', render: (row) => faDate(row.exam_date) },
              ]}
              rows={data.latestGrades}
            />
          )}
        </SectionCard>

        <SectionCard
          title="امتحانات آینده"
          action={<Link className="link-arrow" to="/student/exams">همه امتحانات ←</Link>}
        >
          {data.upcomingExams.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="امتحانی در پیش نیست"
              description="زمان‌بندی امتحانات پس از ثبت توسط مدرسه در این بخش نمایش داده می‌شود."
            />
          ) : (
            <div className="timeline">
              {data.upcomingExams.map((exam) => (
                <div className="timeline-item" key={exam.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{exam.title}</strong>
                    <span>
                      {exam.subject ? `${exam.subject} · ` : ''}
                      {faDate(exam.exam_date)}
                      {exam.start_time ? ` · ${exam.start_time}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid-2">
        <SectionCard
          title="اطلاعیه‌های جدید"
          action={<Link className="link-arrow" to="/student/announcements">همه اطلاعیه‌ها ←</Link>}
        >
          {data.announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="اطلاعیه جدیدی وجود ندارد" />
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

        <SectionCard
          title="افتخارات اخیر"
          action={<Link className="link-arrow" to="/student/honors">همه افتخارات ←</Link>}
        >
          {data.recentHonors.length === 0 ? (
            <EmptyState icon={Award} title="افتخاری ثبت نشده است" description="افتخارات شما پس از ثبت توسط مدرسه نمایش داده می‌شود." />
          ) : (
            <div className="timeline">
              {data.recentHonors.map((honor) => (
                <div className="timeline-item" key={honor.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{honor.title}</strong>
                    <span>
                      {honor.level ? `${honor.level} · ` : ''}
                      {honor.awarded_on ? faDate(honor.awarded_on) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="card card-pad">
        <div className="between">
          <div>
            <h3 style={{ fontSize: 14, color: 'var(--navy-800)' }}>قرارگاه من</h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              {student.campName
                ? `شما عضو ${student.campName} هستید.`
                : 'قرارگاه شما هنوز توسط مدیر مدرسه تعیین نشده است.'}
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/student/camp">
            <Flag /> مشاهده قرارگاه
          </Link>
        </div>
      </div>
    </>
  );
}
