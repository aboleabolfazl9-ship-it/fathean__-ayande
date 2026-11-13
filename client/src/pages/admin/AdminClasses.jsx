import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api, patch, post } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

export default function AdminClasses() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/classes').then(setRows).catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  const open = (cls) => {
    setEditing(cls);
    setForm({
      name: cls.name,
      description: cls.description || '',
      academicYear: cls.academic_year || '',
      imageUrl: cls.image_url || '',
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      await patch(`/admin/classes/${editing.id}`, form);
      setEditing(null);
      setState({ error: '', success: 'اطلاعات کلاس ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>
      <SectionCard title="کلاس‌های مدرسه">
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="کلاسی ثبت نشده است" />
        ) : (
          <DataTable
            columns={[
              { key: 'code', header: 'کد', render: (row) => <b>{row.code}</b> },
              { key: 'name', header: 'نام کلاس', render: (row) => row.name },
              { key: 'grade', header: 'پایه', render: (row) => row.grade },
              { key: 'students', header: 'دانش‌آموزان', render: (row) => <span className="num">{faNum(row.students_count)}</span> },
              { key: 'total', header: 'مجموع جنم', render: (row) => <span className="num">{faNum(row.total)}</span> },
              { key: 'rank', header: 'رتبه', render: (row) => <span className="num">{faNum(row.rank)}</span> },
              { key: 'actions', header: '', render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => open(row)}><Pencil /> ویرایش</Button>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={Boolean(editing)} title="ویرایش کلاس" onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={save} className="stack gap-12">
            <Input label="نام کلاس" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="سال تحصیلی" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
            <Input label="نشانی تصویر کلاس" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="ltr" hint="در صورت خالی بودن، تصویر پیش‌فرض نمایش داده می‌شود." />
            <Textarea label="توضیحات کلاس" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button type="submit" variant="primary">ذخیره</Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
