import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Megaphone, Trophy, UserCheck } from 'lucide-react';
import { api } from '../../api';
import { faDate, faNum, faScore } from '../../utils';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { AnnouncementList } from '../../components/site/ContentCards';

export default function ClassDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/classes/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <EmptyState title="کلاس یافت نشد" description={error} />
          <div style={{ textAlign: 'center' }}>
            <Link className="link-arrow" to="/classes">
              بازگشت به فهرست کلاس‌ها <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="section">
        <div className="container">
          <Spinner />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Link to="/classes" className="link-arrow" style={{ color: 'var(--gold-300)', fontSize: 12.5 }}>
            <ArrowRight /> بازگشت به کلاس‌ها
          </Link>
          <h1 style={{ marginTop: 12 }}>{data.name}</h1>
          <p>
            پایه {data.grade} · {faNum(data.students_count)} دانش‌آموز · مجموع امتیاز جنم {faNum(data.total)}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="stat-grid">
            <div className="stat">
              <span className="label"><UserCheck size={15} /> دانش‌آموزان</span>
              <strong className="num">{faNum(data.students_count)}</strong>
              <span className="foot">ثبت‌شده در این کلاس</span>
            </div>
            <div className="stat">
              <span className="label"><Trophy size={15} /> رتبه کلاس</span>
              <strong className="num">{faNum(data.rank)}</strong>
              <span className="foot">بر اساس مجموع جنم</span>
            </div>
            <div className="stat">
              <span className="label"><BookOpen size={15} /> مجموع جنم</span>
              <strong className="num">{faNum(data.total)}</strong>
              <span className="foot">امتیاز ثبت‌شده کلاس</span>
            </div>
            <div className="stat">
              <span className="label"><CalendarDays size={15} /> امتحانات پیش‌رو</span>
              <strong className="num">{faNum(data.upcomingExams?.length || 0)}</strong>
              <span className="foot">برنامه آزمون‌های کلاس</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="card section-card">
              <div className="section-card-head">
                <h2>اطلاعات آموزشی</h2>
              </div>
              <div className="section-card-body">
                {data.subjects?.length ? (
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    {data.subjects.map((subject) => (
                      <span key={subject.id} className="pill pill-gray">{subject.title}</span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted">دروس این کلاس پس از ثبت امتحانات توسط مدرسه نمایش داده می‌شود.</p>
                )}
                <div className="divider" style={{ margin: '16px 0' }} />
                <h3 style={{ fontSize: 13.5, color: 'var(--navy-800)', marginBottom: 10 }}>امتحانات پیش‌رو</h3>
                {data.upcomingExams?.length ? (
                  <div className="timeline">
                    {data.upcomingExams.map((exam) => (
                      <div className="timeline-item" key={exam.id}>
                        <span className="timeline-dot" />
                        <div className="body">
                          <strong>{exam.title}</strong>
                          <span>
                            {exam.subject ? `${exam.subject} · ` : ''}
                            {faDate(exam.exam_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small muted">امتحانی برای این کلاس ثبت نشده است.</p>
                )}
              </div>
            </div>

            <div className="card section-card">
              <div className="section-card-head">
                <h2>
                  <Megaphone size={15} style={{ verticalAlign: '-3px', marginInlineEnd: 6, color: 'var(--gold-600)' }} />
                  اطلاعیه‌های کلاس
                </h2>
              </div>
              <div className="section-card-body">
                <AnnouncementList items={data.announcements} emptyTitle="اطلاعیه‌ای برای این کلاس منتشر نشده است" />
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="between">
              <div>
                <h3 style={{ fontSize: 14, color: 'var(--navy-800)' }}>فهرست دانش‌آموزان</h3>
                <p className="small muted" style={{ marginTop: 4 }}>
                  اطلاعات خصوصی دانش‌آموزان تنها برای کاربران مجاز در سامانه قابل مشاهده است.
                </p>
              </div>
              <Link className="link-arrow" to="/login">
                ورود با حساب مدرسه ←
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
