import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { faDate, newsCategoryLabel } from '../../utils';
import { Spinner, EmptyState } from '../../components/ui/Feedback';

export default function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/news/${id}`)
      .then(setItem)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <EmptyState title="خبر یافت نشد" description={error} />
          <div style={{ textAlign: 'center' }}>
            <Link to="/news" className="link-arrow">
              بازگشت به اخبار <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    );
  }
  if (!item) {
    return (
      <section className="section">
        <div className="container">
          <Spinner />
        </div>
      </section>
    );
  }

  return (
    <article>
      <section className="page-hero">
        <div className="container">
          <Link to="/news" className="link-arrow" style={{ color: 'var(--gold-300)', fontSize: 12.5 }}>
            <ArrowRight /> بازگشت به اخبار
          </Link>
          <h1 style={{ marginTop: 12, maxWidth: 820 }}>{item.title}</h1>
          <p>
            {newsCategoryLabel(item.category)} · {faDate(item.published_at)}
            {item.author_name ? ` · ${item.author_name}` : ''}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: 26, maxHeight: 420, objectFit: 'cover' }}
            />
          ) : null}
          {item.excerpt ? (
            <p style={{ fontSize: 16, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 18 }}>{item.excerpt}</p>
          ) : null}
          <div style={{ whiteSpace: 'pre-line', color: 'var(--ink-soft)', lineHeight: 2.1 }}>{item.body}</div>
        </div>
      </section>
    </article>
  );
}
