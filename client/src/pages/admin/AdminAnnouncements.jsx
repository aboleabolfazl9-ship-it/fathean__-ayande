import { useEffect, useState } from 'react';
import { Archive, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, del, patch, post } from '../../api';
import { announcementCategoryLabel, faDateTime } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups } from './lookups';

const EMPTY = { title: '', body: '', category: 'public', classId: '', campId: '', imageUrl: '', status: 'draft' };
const CATEGORIES = [
  { value: 'public', label: 'اطلاعیه عمومی' },
  { value: 'class', label: 'اطلاعیه کلاسی' },
  { value: 'camp', label: 'اطلاعیه قرارگاهی' },
  { value: 'teachers', label: 'ویژه معلمان' },
  { value: 'admin', label: 'مدیریتی' },
];

export default function AdminAnnouncements() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/announcements').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      const payload = {
        ...form,
        classId: form.category === 'class' ? Number(form.classId) : null,
        campId: form.category === 'camp' ? Number(form.campId) : null,
      };
      if (editingId) await patch(`/admin/announcements/${editingId}`, payload);
      else await post('/admin/announcements', payload);
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      setState({ error: '', success: 'اطلاعیه ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      body: row.body,
      category: row.category,
      classId: row.class_id || '',
      campId: row.camp_id || '',
      imageUrl: row.image_url || '',
      status: row.status,
    });
    setOpen(true);
  };

  const setStatus = async (row, status) => {
    await patch(`/admin/announcements/${row.id}`, { status });
    load();
  };

  const remove = async (row) => {
    if (!window.confirm(`اطلاعیه «${row.title}» حذف شود؟`)) return;
    await del(`/admin/announcements/${row.id}`);
    setState({ error: '', success: 'اطلاعیه حذف شد.' });
    load();
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard
        title="اطلاعیه‌ها"
        action={<Button variant="primary" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus /> اطلاعیه جدید</Button>}
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="اطلاعیه‌ای منتشر نشده است" description="اطلاعیه‌های عمومی، کلاسی، قرارگاهی و مدیریتی از این بخش منتشر می‌شوند." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => (
                <div>
                  <strong style={{ fontSize: 13 }}>{row.title}</strong>
                  <div className="tiny muted">{row.class_name || row.camp_name || announcementCategoryLabel(row.category)}</div>
                </div>
              ) },
              { key: 'category', header: 'دسته', render: (row) => <Pill tone="gray">{announcementCategoryLabel(row.category)}</Pill> },
              { key: 'status', header: 'وضعیت', render: (row) => (row.status === 'published' ? <Pill tone="green">منتشر شده</Pill> : row.status === 'archived' ? <Pill tone="gray">بایگانی</Pill> : <Pill tone="amber">پیش‌نویس</Pill>) },
              { key: 'date', header: 'انتشار', render: (row) => <span className="tiny">{row.published_at ? faDateTime(row.published_at) : '—'}</span> },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                  {row.status === 'published' ? (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(row, 'archived')}><Archive /> بایگانی</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(row, 'published')}><Eye /> انتشار</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}><Pencil /></Button>
                  <Button variant="danger" size="sm" onClick={() => remove(row)}><Trash2 /></Button>
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={open} title={editingId ? 'ویرایش اطلاعیه' : 'اطلاعیه جدید'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="متن اطلاعیه" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required style={{ minHeight: 140 }} />
          <div className="form-grid">
            <Select
              label="دسته و مخاطب"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES}
            />
            <Select
              label="وضعیت"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'draft', label: 'پیش‌نویس' }, { value: 'published', label: 'منتشر شده' }, { value: 'archived', label: 'بایگانی' }]}
            />
            {form.category === 'class' ? (
              <Select label="کلاس" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} placeholder="انتخاب کلاس" options={lookups.classes.map((c) => ({ value: c.id, label: c.name }))} required />
            ) : null}
            {form.category === 'camp' ? (
              <Select label="قرارگاه" value={form.campId} onChange={(e) => setForm({ ...form, campId: e.target.value })} placeholder="انتخاب قرارگاه" options={lookups.camps.map((c) => ({ value: c.id, label: c.name || `قرارگاه ${c.slot}` }))} required />
            ) : null}
            <Input label="نشانی تصویر" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="ltr full" />
          </div>
          <Button type="submit" variant="primary">ذخیره اطلاعیه</Button>
        </form>
      </Modal>
    </>
  );
}
