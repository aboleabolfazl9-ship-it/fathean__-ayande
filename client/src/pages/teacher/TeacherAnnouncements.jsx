import { useEffect, useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { api, post } from '../../api';
import { announcementCategoryLabel, faDateTime } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../auth';

export default function TeacherAnnouncements() {
  const { user } = useAuth();
  const canAnnounce = Boolean(user?.permissions?.can_announce);
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', classId: '' });
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/teacher/announcements').then(setItems).catch(() => setItems([]));

  useEffect(() => {
    load();
    api('/teacher/classes').then(setClasses).catch(() => setClasses([]));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      await post('/teacher/announcements', { ...form, classId: Number(form.classId) });
      setOpen(false);
      setForm({ title: '', body: '', classId: '' });
      setState({ error: '', success: 'اطلاعیه کلاسی منتشر شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard
        title="اطلاعیه‌ها"
        action={
          canAnnounce ? (
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <Plus /> اطلاعیه کلاسی
            </Button>
          ) : (
            <span className="tiny muted">انتشار اطلاعیه نیازمند مجوز مدیر است</span>
          )
        }
      >
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={Megaphone} title="اطلاعیه‌ای وجود ندارد" />
        ) : (
          <div className="stack gap-12">
            {items.map((item) => (
              <article key={item.id} className="card card-pad">
                <div className="between">
                  <Pill tone="gold">{announcementCategoryLabel(item.category)}</Pill>
                  <span className="tiny muted">
                    {item.class_name ? `${item.class_name} · ` : ''}
                    {faDateTime(item.published_at)}
                  </span>
                </div>
                <h3 style={{ fontSize: 14.5, color: 'var(--navy-800)', marginTop: 10 }}>{item.title}</h3>
                <p className="small muted" style={{ whiteSpace: 'pre-line', marginTop: 6 }}>{item.body}</p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal open={open} title="انتشار اطلاعیه کلاسی" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="کلاس"
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            placeholder="انتخاب کلاس"
            options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
            required
          />
          <Textarea label="متن اطلاعیه" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          <Button type="submit" variant="primary">انتشار</Button>
        </form>
      </Modal>
    </>
  );
}
