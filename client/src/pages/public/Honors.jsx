import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../../api';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { HonorCard } from '../../components/site/ContentCards';
import { Reveal } from '../../components/site/Reveal';

export default function Honors() {
  const [honors, setHonors] = useState(null);
  useEffect(() => {
    api('/public/honors').then(setHonors).catch(() => setHonors([]));
  }, []);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">افتخارات</span>
          <h1>افتخارات مدرسه</h1>
          <p>افتخارات دانش‌آموزان و کلاس‌های مدرسه فاتحان آینده، مطابق ثبت رسمی در سامانه.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {honors === null ? (
            <Spinner />
          ) : honors.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Award}
                title="هنوز افتخاری ثبت نشده است"
                description="افتخارات پس از ثبت توسط مدیر مدرسه، به همراه نام دانش‌آموز یا کلاس در همین بخش منتشر می‌شود."
              />
            </div>
          ) : (
            <div className="grid-2">
              {honors.map((honor, index) => (
                <Reveal key={honor.id} delay={index * 50}>
                  <HonorCard item={honor} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
