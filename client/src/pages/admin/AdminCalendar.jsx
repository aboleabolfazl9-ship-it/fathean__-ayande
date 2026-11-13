import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, del, patch, post } from '../../api';
import { eventTypeLabel, faDate } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups } from './lookups';

const EMPTY = { title: '', description: '', eventDate: '', endDate: '', type: 'school', audience: 'all', classId: '' };
const TYPES = [
  { value: 'school', label: 'برنامه مدرسه' },
  { value: 'exam', label: 'آزمون' },
  { value: 'deadline', label: 'مهلت مهم' },
  { value: 'class', label: 'رویداد کلاسی' },
  { value: 'event', label: 'رویداد' },
];
const AUDIENCES = [
  { value: 'all', label: 'همه' },
  { value: 'students', label: 'دانش‌آموزان' },
  { value: 'teachers', label: 'معلمان' },
  { value: 'class', label: 'یک کلاس مشخص' },
  { value: 'admin', label: 'مدیریت (خصوصی)' },
];

export default function AdminCalendar() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/calendar').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      const payload = { ...form, classId: form.audience === 'class' ? Number(form.classId) : null };
      if (editingId) await patch(`/admin/calendar/${editingId}`, payload);
      else await post('/admin/calendar', payload);
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      setState({ error: '', success: 'رویداد ذخیره شد.' });
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
      eventDate: row.event_date?.slice(0, 10) || '',
      endDate: row.end_date?.slice(0, 10) || '',
      type: row.type,
      audience: row.audience,
      classId: row.class_id || '',
    });
    setOpen(true);
  };

  const remove = async (row) => {
    if (!window.confirm(`رویداد «${row.title}» حذف شود؟`)) return;
    await del(`/admin/calendar/${row.id}`);
    setState({ error: '', success: 'رویداد حذف شد.' });
    load();
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard
        title="تقویم مدرسه"
        action={<Button variant="primary" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus /> رویداد جدید</Button>}
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="رویدادی ثبت نشده است" description="برنامه‌ها، آزمون‌ها و مهلت‌های مهم را در تقویم مدرسه ثبت کنید." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'date', header: 'تاریخ', render: (row) => faDate(row.event_date) },
              { key: 'type', header: 'نوع', render: (row) => <Pill tone="gray">{eventTypeLabel(row.type)}</Pill> },
              { key: 'audience', header: 'مخاطب', render: (row) => (
                row.audience === 'class' ? row.class_name || 'کلاس' : AUDIENCES.find((a) => a.value === row.audience)?.label || row.audience
              ) },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4">
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}><Pencil /></Button>
                  <Button variant="danger" size="sm" onClick={() => remove(row)}><Trash2 /></Button>
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={open} title={editingId ? 'ویرایش رویداد' : 'رویداد جدید'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="form-grid">
            <Input label="تاریخ" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="ltr" required />
            <Input label="تاریخ پایان (اختیاری)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="ltr" />
            <Select label="نوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPES} />
            <Select label="مخاطب" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} options={AUDIENCES} />
            {form.audience === 'class' ? (
              <Select label="کلاس" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} placeholder="انتخاب کلاس" options={lookups.classes.map((c) => ({ value: c.id, label: c.name }))} required className="full" />
            ) : null}
          </div>
          <Textarea label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" variant="primary">ذخیره رویداد</Button>
        </form>
      </Modal>
    </>
  );
}
