import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  Users,
  CalendarClock,
  ClipboardPen,
  Megaphone,
  BarChart3,
  UserRound,
  KeyRound,
} from 'lucide-react';
import { PanelShell } from '../../components/PanelShell';
import { ChangePassword } from '../../components/ChangePassword';
import TeacherOverview from './TeacherOverview';
import TeacherClasses from './TeacherClasses';
import TeacherStudents from './TeacherStudents';
import TeacherExams from './TeacherExams';
import TeacherGrades from './TeacherGrades';
import TeacherAnnouncements from './TeacherAnnouncements';
import TeacherReports from './TeacherReports';
import TeacherProfile from './TeacherProfile';

export default function TeacherPanel() {
  const groups = [
    {
      items: [
        { to: '/teacher', label: 'نمای کلی', icon: LayoutDashboard, end: true },
        { to: '/teacher/classes', label: 'کلاس‌های من', icon: School },
        { to: '/teacher/students', label: 'دانش‌آموزان', icon: Users },
      ],
    },
    {
      label: 'امور آموزشی',
      items: [
        { to: '/teacher/exams', label: 'امتحانات', icon: CalendarClock },
        { to: '/teacher/grades', label: 'ثبت نمرات', icon: ClipboardPen },
        { to: '/teacher/announcements', label: 'اطلاعیه‌ها', icon: Megaphone },
        { to: '/teacher/reports', label: 'گزارش‌های آموزشی', icon: BarChart3 },
      ],
    },
    {
      label: 'حساب کاربری',
      items: [
        { to: '/teacher/profile', label: 'پروفایل', icon: UserRound },
        { to: '/teacher/password', label: 'تغییر رمز عبور', icon: KeyRound },
      ],
    },
  ];

  return (
    <PanelShell title="پنل معلم" groups={groups} accent="معلم">
      <Routes>
        <Route index element={<TeacherOverview />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="exams" element={<TeacherExams />} />
        <Route path="grades" element={<TeacherGrades />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="reports" element={<TeacherReports />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </PanelShell>
  );
}
