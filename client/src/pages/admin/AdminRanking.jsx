import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faDateTime, faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

const TABS = [
  { key: 'students', label: 'دانش‌آموزان' },
  { key: 'classes', label: 'کلاس‌ها' },
  { key: 'camps', label: 'قرارگاه‌ها' },
];

export default function AdminRanking() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('students');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/ranking').then(setData).catch((err) => setError(err.message));
    api('/admin/ranking/history?scope=student').then(setHistory).catch(() => setHistory([]));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  const students = data.students.filter((row) => !search.trim() || row.fullName.includes(search.trim()));

  return (
    <>
      <div className="tabs">
        {TABS.map((item) => (
          <button key={item.key} type="button" className={`tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'students' ? (
        <SectionCard
          title="رتبه‌بندی دانش‌آموزان"
          action={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی نام" style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="جست‌وجو" />}
        >
          <DataTable
            columns={[
              { key: 'rank', header: 'رتبه', render: (row) => <b className="num">{faNum(row.rank)}</b> },
              { key: 'name', header: 'نام', render: (row) => row.fullName },
              { key: 'class', header: 'کلاس', render: (row) => row.className || '—' },
              { key: 'camp', header: 'قرارگاه', render: (row) => row.campName || '—' },
              { key: 'total', header: 'امتیاز جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
            ]}
            rows={students}
            emptyTitle="دانش‌آموزی یافت نشد"
          />
        </SectionCard>
      ) : null}

      {tab === 'classes' ? (
        <SectionCard title="رتبه‌بندی کلاس‌ها">
          <DataTable
            columns={[
              { key: 'rank', header: 'رتبه', render: (row) => <b className="num">{faNum(row.rank)}</b> },
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
              { key: 'rank', header: 'رتبه', render: (row) => <b className="num">{faNum(row.rank)}</b> },
              { key: 'name', header: 'قرارگاه', render: (row) => row.name || `قرارگاه ${faNum(row.slot)}` },
              { key: 'students', header: 'اعضا', render: (row) => <span className="num">{faNum(row.students_count)}</span> },
              { key: 'total', header: 'مجموع جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
            ]}
            rows={data.camps}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="تاریخچه رتبه‌ها">
        {history.length === 0 ? (
          <EmptyState title="تاریخچه رتبه‌ای ثبت نشده است" description="با ثبت نخستین تراکنش جنم، رتبه‌ها به‌صورت خودکار ذخیره می‌شوند." />
        ) : (
          <DataTable
            columns={[
              { key: 'label', header: 'دانش‌آموز', render: (row) => row.ref_label },
              { key: 'rank', header: 'رتبه', render: (row) => <span className="num">{faNum(row.rank)}</span> },
              { key: 'score', header: 'امتیاز', render: (row) => <span className="num">{faNum(row.score)}</span> },
              { key: 'date', header: 'زمان ثبت', render: (row) => <span className="tiny">{faDateTime(row.captured_at)}</span> },
            ]}
            rows={history}
          />
        )}
      </SectionCard>
    </>
  );
}
