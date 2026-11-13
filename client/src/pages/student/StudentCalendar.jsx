import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { api } from '../../api';
import { eventTypeLabel, faDate, faWeekday } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';

export default function StudentCalendar() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/student/calendar').then(setItems).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!items) return <Spinner />;

  const today = new Date(new Date().toDateString());
  const upcoming = items.filter((item) => new Date(item.event_date) >= today);
  const past = items.filter((item) => new Date(item.event_date) < today).slice(0, 10);

  const render = (list) =>
    list.map((item) => (
      <div className="event-item" key={item.id}>
        <div className="event-date">
          <strong className="num">{new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric' }).format(new Date(item.event_date))}</strong>
          <span>{new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long' }).format(new Date(item.event_date))}</span>
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14, color: 'var(--navy-800)' }}>{item.title}</strong>
          <div className="tiny muted">
            {faWeekday(item.event_date)} · {faDate(item.event_date)} · {eventTypeLabel(item.type)}
          </div>
          {item.description ? <p className="small muted" style={{ marginTop: 4 }}>{item.description}</p> : null}
        </div>
      </div>
    ));

  return (
    <>
      <SectionCard title="رویدادهای پیش‌رو">
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="رویدادی ثبت نشده است" description="برنامه‌ها، آزمون‌ها و مهلت‌های مهم در تقویم مدرسه نمایش داده می‌شود." />
        ) : (
          <div className="grid-2">{render(upcoming)}</div>
        )}
      </SectionCard>
      {past.length > 0 ? <SectionCard title="رویدادهای گذشته">{<div className="grid-2">{render(past)}</div>}</SectionCard> : null}
    </>
  );
}
