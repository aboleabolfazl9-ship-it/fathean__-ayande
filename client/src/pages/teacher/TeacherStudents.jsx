import { useEffect, useState } from 'react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function TeacherStudents() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/teacher/classes').then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    setRows(null);
    api(`/teacher/students${classId ? `?classId=${classId}` : ''}`)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [classId]);

  if (error) return <Alert kind="error">{error}</Alert>;

  return (
    <SectionCard
      title="دانش‌آموزان کلاس‌های مجاز"
      action={
        <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }}>
          <option value="">همه کلاس‌ها</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      }
    >
      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="دانش‌آموزی یافت نشد" description="دانش‌آموزان پس از اختصاص کلاس توسط مدیر در این بخش نمایش داده می‌شوند." />
      ) : (
        <DataTable
          columns={[
            { key: 'name', header: 'نام دانش‌آموز', render: (row) => row.full_name },
            { key: 'code', header: 'کد', render: (row) => <span className="ltr tiny">{row.student_code}</span> },
            { key: 'class', header: 'کلاس', render: (row) => row.class_name },
            { key: 'jenm', header: 'امتیاز جنم', render: (row) => <b className="num">{faNum(row.total)}</b> },
          ]}
          rows={rows}
        />
      )}
    </SectionCard>
  );
}
