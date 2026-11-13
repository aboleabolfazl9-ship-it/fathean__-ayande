import { useEffect, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { api, post } from '../../api';
import { faDate, faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../auth';

const TYPE = [
  { value: 'quiz', label: 'آزمونک' },
  { value: 'midterm', label: 'میان‌ترم' },
  { value: 'final', label: 'پایان‌ترم' },
  { value: 'makeup', label: 'جبرانی' },
];

export default function TeacherExams() {
  const { user } = useAuth();
  const canCreate = Boolean(user?.permissions?.can_exams);
  const [exams, setExams] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', classId: '', subjectId: '', examDate: '', startTime: '', durationMinutes: 90, maxScore: 20, type: 'midterm' });
  const [state, setState] = useState({ error: '', success: '' });

  const load = () => api('/teacher/exams').then(setExams).catch(() => setExams([]));

  useEffect(() => {
    load();
    api('/teacher/classes').then(setClasses).catch(() => setClasses([]));
    api('/teacher/lookups').then((data) => setSubjects(data.subjects || [])).catch(() => setSubjects([]));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      await post('/teacher/exams', {
        ...form,
        classId: Number(form.classId),
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        maxScore: Number(form.maxScore),
        durationMinutes: Number(form.durationMinutes),
      });
      setOpen(false);
      setForm({ title: '', classId: '', subjectId: '', examDate: '', startTime: '', durationMinutes: 90, maxScore: 20, type: 'midterm' });
      setState({ error: '', success: 'امتحان ایجاد شد.' });
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
        title="امتحانات کلاس‌های من"
        action={
          canCreate ? (
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <Plus /> ایجاد امتحان
            </Button>
          ) : (
            <span className="tiny muted">ایجاد امتحان نیازمند مجوز مدیر است</span>
          )
        }
      >
        {exams === null ? (
          <Spinner />
        ) : exams.length === 0 ? (
          <EmptyState icon={CalendarClock} title="امتحانی ثبت نشده است" description="امتحانات کلاس‌های اختصاص‌یافته در این بخش نمایش داده می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'title', header: 'عنوان', render: (row) => row.title },
              { key: 'class', header: 'کلاس', render: (row) => row.class_name },
              { key: 'subject', header: 'درس', render: (row) => row.subject || '—' },
              { key: 'date', header: 'تاریخ', render: (row) => faDate(row.exam_date) },
              { key: 'type', header: 'نوع', render: (row) => <Pill tone="gray">{TYPE.find((t) => t.value === row.type)?.label || row.type}</Pill> },
              { key: 'graded', header: 'ثبت نمره', render: (row) => <span className="num">{faNum(row.graded_count)}</span> },
            ]}
            rows={exams}
          />
        )}
      </SectionCard>

      <Modal open={open} title="ایجاد امتحان جدید" onClose={() => setOpen(false)}>
        <form id="exam-form" onSubmit={submit} className="stack gap-12">
          <Input label="عنوان امتحان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="کلاس"
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            placeholder="انتخاب کلاس"
            options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
            required
          />
          <Select
            label="درس"
            value={form.subjectId}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            placeholder="انتخاب درس (اختیاری)"
            options={subjects.map((s) => ({ value: s.id, label: s.title }))}
          />
          <div className="form-grid">
            <Input label="تاریخ" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} required className="ltr" />
            <Input label="ساعت شروع" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="۰۸:۳۰" />
            <Input label="مدت (دقیقه)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            <Input label="نمره کل" type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
          </div>
          <Select label="نوع امتحان" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPE} />
          <Button type="submit" variant="primary">ثبت امتحان</Button>
        </form>
      </Modal>
    </>
  );
}
