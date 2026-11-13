import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Button } from '../../components/ui/Button';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { Reveal } from '../../components/site/Reveal';
import { IMAGES } from '../../components/site/siteData';

export default function Classes() {
  const [classes, setClasses] = useState(null);
  useEffect(() => {
    api('/public/classes').then(setClasses).catch(() => setClasses([]));
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">کلاس‌های آموزشی</span>
          <h1>کلاس‌های مدرسه</h1>
          <p>پنج کلاس فعال مدرسه در سه پایه تحصیلی هفتم، هشتم و نهم. تعداد دانش‌آموزان و امتیاز هر کلاس از پایگاه داده واقعی محاسبه می‌شود.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {classes === null ? (
            <Spinner />
          ) : classes.length === 0 ? (
            <EmptyState title="کلاسی یافت نشد" description="کلاس‌ها از پایگاه داده بارگذاری می‌شوند." />
          ) : (
            <div className="grid-3">
              {classes.map((cls, index) => (
                <Reveal key={cls.id} delay={index * 60}>
                  <article className="card class-card">
                    <div className="class-card-media" style={{ height: 190 }}>
                      <img src={cls.image_url || IMAGES.classThumbs[index % IMAGES.classThumbs.length]} alt={`کلاس ${cls.code}`} loading="lazy" />
                      <span className="grade-chip">پایه {cls.grade}</span>
                    </div>
                    <div className="class-card-body">
                      <h3>{cls.name}</h3>
                      <div className="meta">
                        <span>
                          دانش‌آموزان <b className="num">{faNum(cls.students_count)}</b>
                        </span>
                        <span>
                          مجموع جنم <b className="num">{faNum(cls.total)}</b>
                        </span>
                      </div>
                      <div className="meta">
                        <span>رتبه کلاس</span>
                        <b className="num">{faNum(cls.rank)}</b>
                      </div>
                      {cls.description ? <p className="small muted">{cls.description}</p> : null}
                      <Button variant="ghost" size="sm" to={`/classes/${cls.id}`}>
                        مشاهده کلاس
                        <ArrowLeft />
                      </Button>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
