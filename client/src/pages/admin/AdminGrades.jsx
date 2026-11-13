import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, post } from '../../api';
import { faDateTime, faDate, faNum, faScore } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function AdminGrades() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({});
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState([]);
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/admin/exams')
      .then((rows) => {
        setExams(rows);
        if (rows.length) setExamId(String(rows[0].id));
      })
      .catch(() => setExams([]));
    api('/admin/grades/history').then(setHistory).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    if (!examId) return;
    setData(null);
    setState({ error: '', success: '' });
    api(`/admin/grades?examId=${examId}`)
      .then((result) => {
        setData(result);
        const map = {};
        result.students.forEach((student) => {
          map[student.student_id] = student.score === null ? '' : String(student.score);
        });
        setScores(map);
      })
      .catch((err) => setState({ error: err.message, success: '' }));
  }, [examId]);

  const save = async () => {
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      const grades = Object.entries(scores)
        .filter(([, value]) => value !== '')
        .map(([studentId, value]) => ({ studentId: Number(studentId), score: Number(value) }));
      const result = await post('/admin/grades', { examId: Number(examId), grades, reason: reason || undefined });
      setState({ error: '', success: `نمرات ذخیره شد (${faNum(result.saved)} مورد).` });
      setReason('');
      const refreshed = await api(`/admin/grades?examId=${examId}`);
      setData(refreshed);
      api('/admin/grades/history').then(setHistory).catch(() => {});
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  if (exams.length === 0) {
    return (
      <div className="card">
        <EmptyState title="امتحانی برای ثبت نمره وجود ندارد" description="ابتدا از بخش مدیریت امتحانات، آزمون ایجاد کنید." />
      </div>
    );
  }

  return (
    <>
      <SectionCard
        title="مدیریت نمرات"
        action={
          <select value={examId} onChange={(e) => setExamId(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="انتخاب امتحان">
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.title} — {exam.class_name}</option>
            ))}
          </select>
        }
      >
        <Alert kind="error">{state.error}</Alert>
        <Alert kind="success">{state.success}</Alert>
        {data === null ? (
          <Spinner />
        ) : (
          <>
            <div className="between" style={{ marginBottom: 12 }}>
              <span className="small muted">{data.exam.class_name} · {faDate(data.exam.exam_date)} · {data.exam.subject || 'بدون درس'}</span>
              <Pill tone="gold">نمره کل: {faScore(data.exam.max_score)}</Pill>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>دانش‌آموز</th>
                    <th style={{ width: 130 }}>نمره</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.full_name}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={Number(data.exam.max_score)}
                          step="0.25"
                          value={scores[student.student_id] ?? ''}
                          onChange={(e) => setScores({ ...scores, [student.student_id]: e.target.value })}
                          style={{ width: 90, padding: '6px 9px', borderRadius: 8, border: '1px solid var(--line)' }}
                          aria-label={`نمره ${student.full_name}`}
                        />
                      </td>
                      <td>{student.score === null ? <Pill tone="amber">ثبت نشده</Pill> : <Pill tone="green">{faScore(student.score)}</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row gap-12" style={{ marginTop: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Input label="دلیل تغییر (اختیاری)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button variant="primary" onClick={save} disabled={busy}><Save /> {busy ? 'در حال ذخیره…' : 'ذخیره نمرات'}</Button>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="تاریخچه تغییرات نمرات">
        {history.length === 0 ? (
          <EmptyState title="تغییری ثبت نشده است" />
        ) : (
          <DataTable
            columns={[
              { key: 'student', header: 'دانش‌آموز', render: (row) => row.student_name || '—' },
              { key: 'old', header: 'نمره قبلی', render: (row) => (row.old_score === null ? '—' : faScore(row.old_score)) },
              { key: 'new', header: 'نمره جدید', render: (row) => <b className="num">{faScore(row.new_score)}</b> },
              { key: 'reason', header: 'دلیل', render: (row) => row.reason || '—' },
              { key: 'by', header: 'توسط', render: (row) => row.changed_by_name || '—' },
              { key: 'date', header: 'زمان', render: (row) => <span className="tiny">{faDateTime(row.changed_at)}</span> },
            ]}
            rows={history}
          />
        )}
      </SectionCard>
    </>
  );
}
