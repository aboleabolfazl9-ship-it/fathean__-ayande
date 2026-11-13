import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, del, patch, post } from '../../api';
import { faDateTime, newsCategoryLabel } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

const EMPTY = { title: '', excerpt: '', body: '', category: 'school', imageUrl: '', status: 'draft' };
const CATEGORIES = [
  { value: 'school', label: 'اخبار مدرسه' },
  { value: 'events', label: 'رویدادها' },
  { value: 'competitions', label: 'مسابقات' },
  { value: 'honors', label: 'افتخارات' },
  { value: 'general', label: 'اطلاعیه‌های عمومی' },
];

export default function AdminNews() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/news').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      if (editingId) await patch(`/admin/news/${editingId}`, form);
      else await post('/admin/news', form);
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      setState({ error: '', success: 'خبر ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      excerpt: row.excerpt || '',
      body: row.body,
      category: row.category,
      imageUrl: row.image_url || '',
      status: row.status,
    });
    setOpen(true);
  };

  const publish = async (row) => {
    await patch(`/admin/news/${row.id}`, { status: row.status === 'published' ? 'draft' : 'published' });
    load();
  };

  const remove = async (row) => {
    if (!window.confirm(`خبر «${row.title}» حذف شود؟`)) return;
    await del(`/admin/news/${row.id}`);
    setState({ error: '', success: 'خبر حذف شد.' });
    load();
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard
        title="اخبار مدرسه"
        action={<Button variant="primary" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus /> خبر جدید</Button>}
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="خبری منتشر نشده است" description="با ایجاد خبر و انتشار آن، در سایت و بخش اخبار نمایش داده می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'category', header: 'دسته', render: (row) => newsCategoryLabel(row.category) },
              { key: 'status', header: 'وضعیت', render: (row) => (row.status === 'published' ? <Pill tone="green">منتشر شده</Pill> : row.status === 'archived' ? <Pill tone="gray">بایگانی</Pill> : <Pill tone="amber">پیش‌نویس</Pill>) },
              { key: 'date', header: 'تاریخ انتشار', render: (row) => <span className="tiny">{row.published_at ? faDateTime(row.published_at) : '—'}</span> },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                  <Button variant="ghost" size="sm" onClick={() => publish(row)}>
                    {row.status === 'published' ? <EyeOff /> : <Eye />} {row.status === 'published' ? 'لغو انتشار' : 'انتشار'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}><Pencil /></Button>
                  <Button variant="danger" size="sm" onClick={() => remove(row)}><Trash2 /></Button>
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={open} title={editingId ? 'ویرایش خبر' : 'خبر جدید'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="خلاصه" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <Textarea label="متن خبر" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required style={{ minHeight: 160 }} />
          <div className="form-grid">
            <Select label="دسته" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
            <Select label="وضعیت" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'draft', label: 'پیش‌نویس' }, { value: 'published', label: 'منتشر شده' }, { value: 'archived', label: 'بایگانی' }]} />
            <Input label="نشانی تصویر" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="ltr full" />
          </div>
          <Button type="submit" variant="primary">ذخیره خبر</Button>
        </form>
      </Modal>
    </>
  );
}
