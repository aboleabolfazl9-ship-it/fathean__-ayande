import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '../../api';
import { announcementCategoryLabel, faDateTime } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';

export default function StudentAnnouncements() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/student/announcements').then(setItems).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!items) return <Spinner />;

  return (
    <SectionCard title="اطلاعیه‌های مربوط به من">
      {items.length === 0 ? (
        <EmptyState icon={Megaphone} title="اطلاعیه‌ای منتشر نشده است" description="اطلاعیه‌های عمومی، کلاسی و قرارگاهی شما در این بخش نمایش داده می‌شود." />
      ) : (
        <div className="stack gap-12">
          {items.map((item) => (
            <article key={item.id} className="card card-pad">
              <div className="between">
                <Pill tone="gold">{announcementCategoryLabel(item.category)}</Pill>
                <span className="tiny muted">{faDateTime(item.published_at)}</span>
              </div>
              <h3 style={{ fontSize: 15, color: 'var(--navy-800)', marginTop: 10 }}>{item.title}</h3>
              <p className="small muted" style={{ whiteSpace: 'pre-line', marginTop: 6 }}>{item.body}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
