import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

const TABS = [
  { key: 'students', label: 'رتبه‌بندی دانش‌آموزان' },
  { key: 'classmates', label: 'هم‌کلاسی‌ها' },
  { key: 'classes', label: 'کلاس‌ها' },
  { key: 'camps', label: 'قرارگاه‌ها' },
];

export default function StudentRanking() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('students');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/ranking').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="card card-pad">
        <div className="between">
          <div>
            <span className="eyebrow">رتبه‌بندی خودکار</span>
            <h2 style={{ fontSize: 20, color: 'var(--navy-800)', marginTop: 6 }}>
              رتبه شما: {faNum(data.rank || '—')} از {faNum(data.of)}
            </h2>
            <p className="small muted" style={{ marginTop: 4 }}>
              رتبه‌ها بر اساس مجموع امتیاز جنم محاسبه می‌شوند و در صورت تساوی امتیاز، رتبه یکسان ثبت می‌شود.
            </p>
          </div>
          <span className="pill pill-gold">مجموع جنم: {faNum(data.total)}</span>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button key={item.key} type="button" className={`tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'students' ? (
        <SectionCard title="جدول رتبه‌بندی مدرسه">
          {data.top.length === 0 ? (
            <EmptyState title="رتبه‌بندی در دسترس نیست" />
          ) : (
            <div className="rank-list">
              {data.top.map((row) => (
                <div className="rank-item" key={row.id} style={row.id === data.mine.id ? { outline: '1px solid var(--gold-500)' } : undefined}>
                  <span className="rank-badge num">{faNum(row.rank)}</span>
                  <span className="name">
                    {row.full_name}
                    {row.id === data.mine.id ? <span className="tiny" style={{ color: 'var(--gold-600)' }}> (شما)</span> : null}
                  </span>
                  <span className="score num">{faNum(row.total)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {tab === 'classmates' ? (
        <SectionCard title="رتبه‌بندی هم‌کلاسی‌ها">
          <DataTable
            columns={[
              { key: 'rank', header: 'رتبه', render: (row, index) => <span className="num">{faNum(index + 1)}</span> },
              { key: 'name', header: 'نام', render: (row) => row.fullName },
              { key: 'total', header: 'امتیاز', render: (row) => <b className="num">{faNum(row.total)}</b> },
            ]}
            rows={data.classmates}
            emptyTitle="هم‌کلاسی ثبت نشده است"
          />
        </SectionCard>
      ) : null}

      {tab === 'classes' ? (
        <SectionCard title="رتبه‌بندی کلاس‌ها">
          <DataTable
            columns={[
              { key: 'rank', header: 'رتبه', render: (row) => <span className="num">{faNum(row.rank)}</span> },
              { key: 'name', header: 'کلاس', render: (row) => row.name },
              { key: 'students', header: 'دانش‌آموزان', render: (row) => <span className="num">{faNum(row.students_count)}</span> },
              { key: 'total', header: 'مجموع جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
            ]}
            rows={data.classes}
          />
        </SectionCard>
      ) : null}

      {tab === 'camps' ? (
        <SectionCard title="رتبه‌بندی قرارگاه‌ها">
          <DataTable
            columns={[
              { key: 'rank', header: 'رتبه', render: (row) => <span className="num">{faNum(row.rank)}</span> },
              { key: 'name', header: 'قرارگاه', render: (row) => row.name || `قرارگاه ${faNum(row.slot)}` },
              { key: 'students', header: 'اعضا', render: (row) => <span className="num">{faNum(row.students_count)}</span> },
              { key: 'total', header: 'مجموع جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
            ]}
            rows={data.camps}
          />
        </SectionCard>
      ) : null}
    </>
  );
}
