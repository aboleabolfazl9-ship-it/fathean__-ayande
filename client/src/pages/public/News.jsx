import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { api } from '../../api';
import { newsCategoryLabel } from '../../utils';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { NewsCard } from '../../components/site/ContentCards';

const TABS = ['all', 'school', 'events', 'competitions', 'honors', 'general'];

export default function News() {
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    api(`/public/news?category=${category}`).then(setItems).catch(() => setItems([]));
  }, [category]);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">اخبار و اطلاعیه‌ها</span>
          <h1>اخبار مدرسه فاتحان آینده</h1>
          <p>اخبار مدرسه، رویدادها، مسابقات، افتخارات و اطلاعیه‌های عمومی در این بخش منتشر می‌شود.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="tabs" style={{ marginBottom: 26 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab ${category === tab ? 'active' : ''}`}
                onClick={() => setCategory(tab)}
              >
                {tab === 'all' ? 'همه' : newsCategoryLabel(tab)}
              </button>
            ))}
          </div>
          {items === null ? (
            <Spinner />
          ) : items.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Newspaper}
                title="در این دسته خبری منتشر نشده است"
                description="به‌محض انتشار خبر از سوی مدیر مدرسه، در همین بخش نمایش داده می‌شود."
              />
            </div>
          ) : (
            <div className="grid-3">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
