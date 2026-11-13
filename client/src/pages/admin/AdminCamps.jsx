import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { api, patch } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { Modal } from '../../components/ui/Modal';

export default function AdminCamps() {
  const [camps, setCamps] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/camps').then(setCamps).catch(() => setCamps([]));
  useEffect(() => { load(); }, []);

  const open = (camp) => {
    setEditing(camp);
    setForm({
      name: camp.name || '',
      color: camp.color || '#C6A662',
      logoUrl: camp.logo_url || '',
      description: camp.description || '',
      isActive: camp.is_active,
    });
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      await patch(`/admin/camps/${editing.id}`, form);
      setEditing(null);
      setState({ error: '', success: 'اطلاعات قرارگاه ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <div className="card card-pad">
        <h3 style={{ fontSize: 14, color: 'var(--navy-800)' }}>پنج قرارگاه مدرسه</h3>
        <p className="small muted" style={{ marginTop: 4 }}>
          نام رسمی قرارگاه‌ها توسط مدرسه تعیین می‌شود. تا زمان نام‌گذاری، سامانه عنوان موقت «قرارگاه ۱ تا ۵» را نمایش
          می‌دهد و هیچ نامی به‌صورت خودکار ساخته نمی‌شود.
        </p>
      </div>

      {camps === null ? (
        <Spinner />
      ) : camps.length === 0 ? (
        <div className="card"><EmptyState title="قرارگاهی ثبت نشده است" /></div>
      ) : (
        <div className="grid-2">
          {camps.map((camp) => (
            <article key={camp.id} className="card camp-card" style={{ '--camp-color': camp.color }}>
              <div className="between">
                <span className="camp-logo">{faNum(camp.slot)}</span>
                <div className="row gap-4">
                  {camp.is_active ? <Pill tone="green">فعال</Pill> : <Pill tone="red">غیرفعال</Pill>}
                  <Pill tone="gold">رتبه {faNum(camp.rank)}</Pill>
                </div>
              </div>
              <h3>{camp.name || 'بدون نام رسمی'}</h3>
              <p className="small muted">{camp.description || 'توضیحی ثبت نشده است.'}</p>
              <div className="camp-stats">
                <div><b className="num">{faNum(camp.students_count)}</b> عضو</div>
                <div><b className="num">{faNum(camp.total)}</b> مجموع جنم</div>
              </div>
              <div className="tiny muted">
                {(camp.members || []).slice(0, 6).map((m) => m.full_name).join('، ')}
                {(camp.members || []).length > 6 ? ` و ${faNum(camp.members.length - 6)} نفر دیگر` : ''}
                {(camp.members || []).length === 0 ? 'عضوی به این قرارگاه اختصاص نیافته است.' : ''}
              </div>
              <Button variant="ghost" size="sm" onClick={() => open(camp)}><Pencil /> ویرایش قرارگاه</Button>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} title="ویرایش قرارگاه" onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={save} className="stack gap-12">
            <Input label="نام رسمی قرارگاه" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} hint="در صورت خالی بودن، عنوان موقت نمایش داده می‌شود." />
            <div className="form-grid">
              <Input label="رنگ اختصاصی" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <Input label="نشانی لوگو" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="ltr" />
            </div>
            <Textarea label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="check-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              قرارگاه فعال است
            </label>
            <Button type="submit" variant="primary">ذخیره</Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
