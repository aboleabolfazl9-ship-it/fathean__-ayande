import { useEffect, useState } from 'react';
import { School, Users } from 'lucide-react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState } from '../../components/ui/Feedback';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';

export default function TeacherClasses() {
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/teacher/classes').then(setClasses).catch((err) => setError(err.message));
  }, []);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!classes) return <Spinner />;

  return (
    <SectionCard title="کلاس‌های اختصاص‌یافته به من">
      {classes.length === 0 ? (
        <EmptyState icon={School} title="کلاسی به شما اختصاص داده نشده است" description="برای دسترسی به کلاس‌ها با مدیر مدرسه هماهنگ کنید." />
      ) : (
        <DataTable
          columns={[
            { key: 'name', header: 'کلاس', render: (row) => row.name },
            { key: 'grade', header: 'پایه', render: (row) => row.grade },
            { key: 'students', header: 'دانش‌آموزان', render: (row) => <span className="row gap-4"><Users size={14} /> <b className="num">{faNum(row.students_count)}</b></span> },
          ]}
          rows={classes}
        />
      )}
    </SectionCard>
  );
}
