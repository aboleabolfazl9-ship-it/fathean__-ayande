import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../../api';
import { faDateTime, faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';

export default function StudentJenm() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/jenm').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard label="مجموع امتیاز جنم" value={faNum(data.total)} icon={Sparkles} foot="محاسبه از تراکنش‌های ثبت‌شده" />
        <StatCard label="رتبه فعلی" value={faNum(data.rank || '—')} icon={TrendingUp} foot={`از ${faNum(data.of)} دانش‌آموز`} />
        <StatCard label="تعداد تراکنش‌ها" value={faNum(data.transactions.length)} icon={Sparkles} />
      </div>

      <SectionCard title="تاریخچه امتیاز جنم">
        {data.transactions.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="هنوز امتیازی برای شما ثبت نشده است"
            description="امتیاز اولیه همه دانش‌آموزان صفر است. هر تغییر امتیاز همراه با دلیل و ثبت‌کننده در این بخش نمایش داده می‌شود."
          />
        ) : (
          <div className="timeline">
            {data.transactions.map((tx) => (
              <div className="timeline-item" key={tx.id}>
                <span className="timeline-dot" />
                <div className="body">
                  <strong>{tx.reason}</strong>
                  <span>
                    {tx.created_by_name || 'سیستم'} · {faDateTime(tx.created_at)}
                  </span>
                </div>
                <span className={`amount num ${tx.amount >= 0 ? 'plus' : 'minus'}`}>
                  {tx.amount >= 0 ? '+' : '−'}
                  {faNum(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="alert alert-info">
        امکان تغییر امتیاز جنم تنها برای مدیر مدرسه و معلمان دارای مجوز فراهم است؛ دانش‌آموزان فقط می‌توانند تاریخچه
        امتیاز خود را مشاهده کنند.
      </div>
    </>
  );
}
