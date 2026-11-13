import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, post } from '../../api';
import { faDate, faNum, faScore } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { SectionCard } from '../../components/ui/Stat';
import { useAuth } from '../../auth';

export default function TeacherGrades() {
  const { user } = useAuth();
  const canGrade = Boolean(user?.permissions?.can_grade);
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({});
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/teacher/exams')
      .then((rows) => {
        setExams(rows);
        if (rows.length) setExamId(String(rows[0].id));
      })
      .catch(() => setExams([]));
  }, []);

  useEffect(() => {
    if (!examId) return;
    setData(null);
    setState({ error: '', success: '' });
    api(`/teacher/grades?examId=${examId}`)
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
      const payload = Object.entries(scores)
        .filter(([, value]) => value !== '')
        .map(([studentId, value]) => ({ studentId: Number(studentId), score: Number(value) }));
      const result = await post('/teacher/grades', { examId: Number(examId), grades: payload });
      setState({ error: '', success: `نمرات ذخیره شد (${faNum(result.saved)} مورد).` });
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  if (exams.length === 0) {
    return (
      <div className="card">
        <EmptyState title="امتحانی برای ثبت نمره وجود ندارد" description="ابتدا از بخش امتحانات، آزمون کلاس خود را ایجاد کنید." />
      </div>
    );
  }

  return (
    <>
      <SectionCard
        title="ثبت و ویرایش نمرات"
        action={
          <select value={examId} onChange={(e) => setExamId(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }}>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} — {exam.class_name}
              </option>
            ))}
          </select>
        }
      >
        <Alert kind="error">{state.error}</Alert>
        <Alert kind="success">{state.success}</Alert>
        {!canGrade ? (
          <Alert kind="warn">مجوز ثبت نمره توسط مدیر برای شما فعال نشده است.</Alert>
        ) : null}
        {data === null ? (
          <Spinner />
        ) : (
          <>
            <div className="between" style={{ marginBottom: 12 }}>
              <span className="small muted">
                {data.exam.title} · {data.exam.class_name} · تاریخ {faDate(data.exam.exam_date)}
              </span>
              <Pill tone="gold">نمره کل: {faScore(data.exam.max_score)}</Pill>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>دانش‌آموز</th>
                    <th style={{ width: 140 }}>نمره</th>
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
                          disabled={!canGrade}
                          style={{ width: 90, padding: '6px 9px', borderRadius: 8, border: '1px solid var(--line)' }}
                          aria-label={`نمره ${student.full_name}`}
                        />
                      </td>
                      <td>
                        {student.score === null ? (
                          <Pill tone="amber">ثبت نشده</Pill>
                        ) : (
                          <Pill tone="green">ثبت‌شده: {faScore(student.score)}</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="primary" onClick={save} disabled={!canGrade || busy}>
                <Save />
                {busy ? 'در حال ذخیره…' : 'ذخیره نمرات'}
              </Button>
            </div>
          </>
        )}
      </SectionCard>
      <div className="alert alert-info">
        هر تغییر نمره همراه با نام ثبت‌کننده و تاریخ در تاریخچه نمرات ذخیره می‌شود.
      </div>
    </>
  );
}
