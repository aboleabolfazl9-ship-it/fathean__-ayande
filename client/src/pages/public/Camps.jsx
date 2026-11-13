import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { Reveal } from '../../components/site/Reveal';

export default function Camps() {
  const [camps, setCamps] = useState(null);
  useEffect(() => {
    api('/public/camps').then(setCamps).catch(() => setCamps([]));
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">قرارگاه‌ها</span>
          <h1>پنج قرارگاه مدرسه</h1>
          <p>
            دانش‌آموزان در پنج قرارگاه سازمان‌دهی می‌شوند. نام، رنگ و نشان هر قرارگاه توسط مدیر مدرسه تعیین می‌شود و
            امتیاز هر قرارگاه از مجموع جنم اعضای آن محاسبه می‌گردد.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {camps === null ? (
            <Spinner />
          ) : camps.length === 0 ? (
            <EmptyState title="قرارگاهی ثبت نشده است" />
          ) : (
            <div className="grid-3">
              {camps.map((camp, index) => (
                <Reveal key={camp.id} delay={index * 60}>
                  <article className="card camp-card" style={{ '--camp-color': camp.color, padding: 26 }}>
                    <div className="between">
                      <span className="camp-logo" style={{ width: 54, height: 54, fontSize: 18 }}>{faNum(camp.slot)}</span>
                      <span className={`pill ${camp.name ? 'pill-gold' : 'pill-gray'}`}>
                        {camp.name ? `رتبه ${faNum(camp.rank)}` : 'در انتظار نام‌گذاری'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18 }}>{camp.name || 'نام رسمی قرارگاه تنظیم نشده است'}</h3>
                    <p className="small muted">
                      {camp.description || 'توضیحات این قرارگاه توسط مدیر مدرسه تکمیل می‌شود.'}
                    </p>
                    <div className="camp-stats">
                      <div>
                        <b className="num">{faNum(camp.students_count)}</b>
                        <Users size={12} style={{ verticalAlign: '-1px' }} /> دانش‌آموز
                      </div>
                      <div>
                        <b className="num">{faNum(camp.total)}</b>
                        <Trophy size={12} style={{ verticalAlign: '-1px' }} /> امتیاز جنم
                      </div>
                    </div>
                    <Link className="link-arrow" to={`/camps/${camp.id}`}>
                      مشاهده قرارگاه ←
                    </Link>
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
