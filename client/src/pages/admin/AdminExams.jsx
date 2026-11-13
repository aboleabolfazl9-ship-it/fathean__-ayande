import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, del, post } from '../../api';
import { faDate, faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups } from './lookups';

const TYPE = [
  { value: 'quiz', label: 'آزمونک' },
  { value: 'midterm', label: 'میان‌ترم' },
  { value: 'final', label: 'پایان‌ترم' },
  { value: 'makeup', label: 'جبرانی' },
];

export default function AdminExams() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ error: '', success: '' });
  const [form, setForm] = useState({ title: '', classId: '', subjectId: '', examDate: '', startTime: '', durationMinutes: 90, maxScore: 20, type: 'midterm', description: '' });

  const load = () => api('/admin/exams').then(setRows).catch(() => setRows([]));
  useEffect(() => {
    load();
    api('/admin/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await post('/admin/exams', {
        ...form,
        classId: Number(form.classId),
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        durationMinutes: Number(form.durationMinutes),
        maxScore: Number(form.maxScore),
      });
      setOpen(false);
      setForm({ title: '', classId: '', subjectId: '', examDate: '', startTime: '', durationMinutes: 90, maxScore: 20, type: 'midterm', description: '' });
      setState({ error: '', success: 'امتحان ایجاد شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`حذف امتحان «${row.title}» و نمرات مرتبط با آن انجام شود؟`)) return;
    try {
      await del(`/admin/exams/${row.id}`);
      setState({ error: '', success: 'امتحان حذف شد.' });
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
        title="امتحانات مدرسه"
        action={<Button variant="primary" size="sm" onClick={() => setOpen(true)}><Plus /> ایجاد امتحان</Button>}
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="امتحانی ثبت نشده است" description="با ایجاد امتحان، زمان‌بندی آن در پنل دانش‌آموزان و تقویم نمایش داده می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'class', header: 'کلاس', render: (row) => row.class_name },
              { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
              { key: 'date', header: 'تاریخ', render: (row) => faDate(row.exam_date) },
              { key: 'type', header: 'نوع', render: (row) => <Pill tone="gray">{TYPE.find((t) => t.value === row.type)?.label}</Pill> },
              { key: 'grades', header: 'نمرات', render: (row) => <span className="num">{faNum(row.graded_count)} / {faNum(row.students_count)}</span> },
              { key: 'actions', header: '', render: (row) => (
                <Button variant="danger" size="sm" onClick={() => remove(row)}><Trash2 /> حذف</Button>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={open} title="ایجاد امتحان" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="stack gap-12">
          <Input label="عنوان امتحان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="form-grid">
            <Select label="کلاس" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} placeholder="انتخاب کلاس" options={lookups.classes.map((c) => ({ value: c.id, label: c.name }))} required />
            <Select label="درس" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} placeholder="اختیاری" options={subjects.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.title }))} />
            <Input label="تاریخ" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="ltr" required />
            <Input label="ساعت شروع" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="۰۸:۳۰" />
            <Input label="مدت (دقیقه)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            <Input label="نمره کل" type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            <Select label="نوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPE} className="full" />
          </div>
          <Textarea label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" variant="primary">ثبت امتحان</Button>
        </form>
      </Modal>
    </>
  );
}
