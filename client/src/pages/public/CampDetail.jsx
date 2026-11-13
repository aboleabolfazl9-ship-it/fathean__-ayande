import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Megaphone, Trophy, Users } from 'lucide-react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { AnnouncementList, HonorCard } from '../../components/site/ContentCards';

export default function CampDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/camps/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <EmptyState title="قرارگاه یافت نشد" description={error} />
          <div style={{ textAlign: 'center' }}>
            <Link className="link-arrow" to="/camps">
              بازگشت به قرارگاه‌ها <ArrowRight />
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
          <Link to="/camps" className="link-arrow" style={{ color: 'var(--gold-300)', fontSize: 12.5 }}>
            <ArrowRight /> بازگشت به قرارگاه‌ها
          </Link>
          <h1 style={{ marginTop: 12 }}>{data.name || `قرارگاه ${faNum(data.slot)}`}</h1>
          <p>{data.description || 'نام رسمی و توضیحات این قرارگاه توسط مدیر مدرسه تعیین می‌شود.'}</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            <div className="stat">
              <span className="label"><Users size={15} /> اعضا</span>
              <strong className="num">{faNum(data.students_count)}</strong>
            </div>
            <div className="stat">
              <span className="label"><Trophy size={15} /> مجموع جنم</span>
              <strong className="num">{faNum(data.total)}</strong>
            </div>
            <div className="stat">
              <span className="label"><Trophy size={15} /> رتبه قرارگاه</span>
              <strong className="num">{faNum(data.rank)}</strong>
            </div>
          </div>

          <div className="grid-2">
            <div className="card section-card">
              <div className="section-card-head">
                <h2>
                  <Megaphone size={15} style={{ verticalAlign: '-3px', marginInlineEnd: 6, color: 'var(--gold-600)' }} />
                  اطلاعیه‌های قرارگاه
                </h2>
              </div>
              <div className="section-card-body">
                <AnnouncementList items={data.announcements} emptyTitle="اطلاعیه‌ای برای این قرارگاه منتشر نشده است" />
              </div>
            </div>
            <div className="card section-card">
              <div className="section-card-head">
                <h2>تاریخچه افتخارات</h2>
              </div>
              <div className="section-card-body">
                {data.honors?.length ? (
                  <div className="stack gap-12">
                    {data.honors.map((honor) => (
                      <HonorCard key={honor.id} item={honor} />
                    ))}
                  </div>
                ) : (
                  <p className="small muted">افتخاری برای این قرارگاه ثبت نشده است.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
