import { Link } from 'react-router-dom';
import { Award, CalendarDays, Megaphone, Newspaper } from 'lucide-react';
import { faDate, faDateShort, faNum, faWeekday, newsCategoryLabel, eventTypeLabel } from '../../utils';
import { EmptyState } from '../ui/Feedback';

export function NewsCard({ item }) {
  return (
    <article className="card news-card">
      {item.image_url ? (
        <div className="thumb">
          <img src={item.image_url} alt={item.title} loading="lazy" />
        </div>
      ) : (
        <div className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--gold-600)' }}>
          <Newspaper size={38} />
        </div>
      )}
      <div className="body">
        <span className="date">
          {newsCategoryLabel(item.category)} · {faDate(item.published_at)}
        </span>
        <h3>{item.title}</h3>
        {item.excerpt ? <p>{item.excerpt}</p> : null}
        <Link className="link-arrow" to={`/news/${item.id}`} style={{ marginTop: 'auto' }}>
          ادامه خبر ←
        </Link>
      </div>
    </article>
  );
}

export function HonorCard({ item }) {
  const owner = item.student_name || item.class_name || item.camp_name;
  return (
    <article className="card honor-card">
      <span className="honor-icon">
        <Award />
      </span>
      <div>
        <strong style={{ color: 'var(--navy-800)', fontSize: 14 }}>{item.title}</strong>
        {item.description ? <p className="small muted" style={{ marginTop: 4 }}>{item.description}</p> : null}
        <div className="tiny muted" style={{ marginTop: 8 }}>
          {owner ? `${owner} · ` : ''}
          {item.awarded_on ? faDate(item.awarded_on) : ''}
          {item.level ? ` · ${item.level}` : ''}
        </div>
      </div>
    </article>
  );
}

export function EventItem({ item }) {
  const date = new Date(item.event_date);
  return (
    <div className="event-item">
      <div className="event-date">
        <strong>{faNum(Number(new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric' }).format(date)))}</strong>
        <span>{new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long' }).format(date)}</span>
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 14, color: 'var(--navy-800)' }}>{item.title}</strong>
        <div className="tiny muted">
          {faWeekday(date)} · {faDateShort(date)} · {eventTypeLabel(item.type)}
          {item.class_name ? ` · ${item.class_name}` : ''}
        </div>
      </div>
      <CalendarDays size={18} style={{ color: 'var(--gold-600)' }} />
    </div>
  );
}

export function AnnouncementList({ items, emptyTitle = 'اطلاعیه‌ای منتشر نشده است' }) {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="به‌محض انتشار اطلاعیه از سوی مدیر مدرسه، در همین بخش نمایش داده می‌شود."
        icon={Megaphone}
      />
    );
  }
  return (
    <div className="timeline">
      {items.map((item) => (
        <div className="timeline-item" key={item.id}>
          <span className="timeline-dot" />
          <div className="body">
            <strong>{item.title}</strong>
            <p className="small muted" style={{ marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.body}
            </p>
            <span>{faDate(item.published_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
