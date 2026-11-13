import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, patch, post } from '../../api';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function AdminSubjects() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ title: '', code: '', gradeLevel: '' });
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/admin/subjects').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      await post('/admin/subjects', {
        title: form.title,
        code: form.code || null,
        gradeLevel: form.gradeLevel ? Number(form.gradeLevel) : null,
      });
      setForm({ title: '', code: '', gradeLevel: '' });
      setState({ error: '', success: 'درس ایجاد شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const toggle = async (row) => {
    await patch(`/admin/subjects/${row.id}`, { isActive: !row.is_active });
    load();
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>

      <SectionCard title="افزودن درس">
        <form onSubmit={submit} className="grid-4" style={{ alignItems: 'end' }}>
          <Input label="عنوان درس" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="کد درس" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="ltr" />
          <Select
            label="پایه"
            value={form.gradeLevel}
            onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
            placeholder="همه پایه‌ها"
            options={[
              { value: 7, label: 'هفتم' },
              { value: 8, label: 'هشتم' },
              { value: 9, label: 'نهم' },
            ]}
          />
          <Button type="submit" variant="primary"><Plus /> افزودن درس</Button>
        </form>
      </SectionCard>

      <SectionCard title={`دروس ${rows ? `(${rows.length ? new Intl.NumberFormat('fa-IR').format(rows.length) : '۰'})` : ''}`}>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="درسی ثبت نشده است" description="برای ثبت امتحان و نمره، ابتدا دروس مدرسه را تعریف کنید." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'code', header: 'کد', render: (row) => <span className="ltr tiny">{row.code || '—'}</span> },
              { key: 'grade', header: 'پایه', render: (row) => (row.grade_level ? `${row.grade_level}` : 'همه') },
              { key: 'status', header: 'وضعیت', render: (row) => (row.is_active ? <Pill tone="green">فعال</Pill> : <Pill tone="red">غیرفعال</Pill>) },
              { key: 'actions', header: '', render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => toggle(row)}>{row.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</Button>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>
    </>
  );
}
