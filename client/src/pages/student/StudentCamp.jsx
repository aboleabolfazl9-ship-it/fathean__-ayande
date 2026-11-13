import { useEffect, useState } from 'react';
import { Flag, Trophy, Users, Award } from 'lucide-react';
import { api } from '../../api';
import { faDate, faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { StatCard, SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function StudentCamp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student/camp').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return <Spinner />;

  if (!data.assigned) {
    return (
      <div className="card">
        <EmptyState
          icon={Flag}
          title="قرارگاه شما هنوز تعیین نشده است"
          description="پس از اختصاص قرارگاه توسط مدیر مدرسه، اعضای قرارگاه، امتیاز و رتبه در این بخش نمایش داده می‌شود."
        />
      </div>
    );
  }

  return (
    <>
      <div className="card card-pad" style={{ background: 'var(--navy-900)', color: '#fff' }}>
        <div className="between">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>قرارگاه من</span>
            <h2 style={{ fontSize: 22, marginTop: 6 }}>{data.camp.name || 'نام قرارگاه توسط مدیر تعیین می‌شود'}</h2>
            <p className="small" style={{ color: 'rgba(255,255,255,.7)', marginTop: 4 }}>
              {data.camp.description || 'توضیحات این قرارگاه پس از تنظیم مدیر نمایش داده می‌شود.'}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--gold-300)' }} className="num">
              {faNum(data.camp.rank)}
            </div>
            <span className="tiny" style={{ color: 'rgba(255,255,255,.6)' }}>رتبه قرارگاه</span>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard label="اعضای قرارگاه" value={faNum(data.camp.students_count)} icon={Users} />
        <StatCard label="مجموع جنم" value={faNum(data.camp.total)} icon={Trophy} />
        <StatCard label="افتخارات" value={faNum(data.honors.length)} icon={Award} />
      </div>

      <SectionCard title="اعضای قرارگاه">
        <DataTable
          columns={[
            { key: 'name', header: 'نام', render: (row) => row.full_name },
            { key: 'class', header: 'کلاس', render: (row) => row.class_code || '—' },
            { key: 'total', header: 'امتیاز جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
          ]}
          rows={data.members}
          emptyTitle="عضوی در این قرارگاه ثبت نشده است"
        />
      </SectionCard>

      <div className="grid-2">
        <SectionCard title="اطلاعیه‌های قرارگاه">
          {data.announcements.length === 0 ? (
            <EmptyState title="اطلاعیه‌ای منتشر نشده است" />
          ) : (
            <div className="timeline">
              {data.announcements.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{item.title}</strong>
                    <p className="small muted">{item.body}</p>
                    <span>{faDate(item.published_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="افتخارات قرارگاه">
          {data.honors.length === 0 ? (
            <EmptyState title="افتخاری ثبت نشده است" />
          ) : (
            <div className="timeline">
              {data.honors.map((honor) => (
                <div className="timeline-item" key={honor.id}>
                  <span className="timeline-dot" />
                  <div className="body">
                    <strong>{honor.title}</strong>
                    <span>{honor.awarded_on ? faDate(honor.awarded_on) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
