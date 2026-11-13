import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../../api';
import { faDate } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';

export default function StudentHonors() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/student/honors').then(setItems).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!items) return <Spinner />;

  return (
    <SectionCard title="افتخارات من">
      {items.length === 0 ? (
        <EmptyState icon={Award} title="افتخاری ثبت نشده است" description="افتخارات شما پس از ثبت توسط مدرسه در این بخش نمایش داده می‌شود." />
      ) : (
        <div className="stack gap-12">
          {items.map((item) => (
            <div className="card honor-card" key={item.id}>
              <span className="honor-icon">
                <Award />
              </span>
              <div>
                <strong style={{ color: 'var(--navy-800)', fontSize: 14 }}>{item.title}</strong>
                {item.description ? <p className="small muted" style={{ marginTop: 4 }}>{item.description}</p> : null}
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  {item.level ? `${item.level} · ` : ''}
                  {item.awarded_on ? faDate(item.awarded_on) : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
