import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, del, patch, post } from '../../api';
import { faDate } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups } from './lookups';

const EMPTY = { title: '', description: '', studentId: '', classId: '', campId: '', level: '', awardedOn: '', imageUrl: '' };

export default function AdminHonors() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/honors').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    const payload = {
      ...form,
      studentId: form.studentId ? Number(form.studentId) : null,
      classId: form.classId ? Number(form.classId) : null,
      campId: form.campId ? Number(form.campId) : null,
      awardedOn: form.awardedOn || null,
    };
    try {
      if (editingId) await patch(`/admin/honors/${editingId}`, payload);
      else await post('/admin/honors', payload);
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      setState({ error: '', success: 'افتخار ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description || '',
      studentId: row.student_id || '',
      classId: row.class_id || '',
      campId: row.camp_id || '',
      level: row.level || '',
      awardedOn: row.awarded_on ? row.awarded_on.slice(0, 10) : '',
      imageUrl: row.image_url || '',
    });
    setOpen(true);
  };

  const remove = async (row) => {
    if (!window.confirm(`افتخار «${row.title}» حذف شود؟`)) return;
    await del(`/admin/honors/${row.id}`);
    setState({ error: '', success: 'افتخار حذف شد.' });
    load();
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard
        title="افتخارات"
        action={<Button variant="primary" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus /> ثبت افتخار</Button>}
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="افتخاری ثبت نشده است" description="افتخارات دانش‌آموزان و کلاس‌ها را از این بخش ثبت کنید تا در سایت و پنل‌ها نمایش داده شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'owner', header: 'مالک', render: (row) => row.student_name || row.class_name || row.camp_name || 'مدرسه' },
              { key: 'level', header: 'سطح', render: (row) => row.level || '—' },
              { key: 'date', header: 'تاریخ', render: (row) => (row.awarded_on ? faDate(row.awarded_on) : '—') },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4">
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}><Pencil /> ویرایش</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(row)}><Trash2 /></Button>
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={open} title={editingId ? 'ویرایش افتخار' : 'ثبت افتخار'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="form-grid">
            <Select label="دانش‌آموز" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="بدون دانش‌آموز" options={lookups.students.map((s) => ({ value: s.id, label: s.full_name }))} />
            <Select label="کلاس" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} placeholder="بدون کلاس" options={lookups.classes.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="قرارگاه" value={form.campId} onChange={(e) => setForm({ ...form, campId: e.target.value })} placeholder="بدون قرارگاه" options={lookups.camps.map((c) => ({ value: c.id, label: c.name || `قرارگاه ${c.slot}` }))} />
            <Input label="سطح" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="مثلاً استانی" />
            <Input label="تاریخ" type="date" value={form.awardedOn} onChange={(e) => setForm({ ...form, awardedOn: e.target.value })} className="ltr" />
            <Input label="نشانی تصویر" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="ltr" />
          </div>
          <Button type="submit" variant="primary">ذخیره</Button>
        </form>
      </Modal>
    </>
  );
}
