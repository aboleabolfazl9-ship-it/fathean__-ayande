import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserRound,
  School,
  Flag,
  Sparkles,
  Trophy,
  ClipboardList,
  CalendarClock,
  Award,
  Megaphone,
  CalendarDays,
  KeyRound,
} from 'lucide-react';
import { PanelShell } from '../../components/PanelShell';
import { ChangePassword } from '../../components/ChangePassword';
import StudentOverview from './StudentOverview';
import StudentProfile from './StudentProfile';
import StudentClass from './StudentClass';
import StudentCamp from './StudentCamp';
import StudentJenm from './StudentJenm';
import StudentRanking from './StudentRanking';
import StudentGrades from './StudentGrades';
import StudentExams from './StudentExams';
import StudentHonors from './StudentHonors';
import StudentAnnouncements from './StudentAnnouncements';
import StudentCalendar from './StudentCalendar';

const GROUPS = [
  {
    items: [
      { to: '/student', label: 'نمای کلی', icon: LayoutDashboard, end: true },
      { to: '/student/profile', label: 'پروفایل من', icon: UserRound },
      { to: '/student/class', label: 'اطلاعات کلاس', icon: School },
      { to: '/student/camp', label: 'قرارگاه من', icon: Flag },
    ],
  },
  {
    label: 'پیشرفت تحصیلی',
    items: [
      { to: '/student/jenm', label: 'امتیاز جنم', icon: Sparkles },
      { to: '/student/ranking', label: 'رتبه‌بندی', icon: Trophy },
      { to: '/student/grades', label: 'نمرات', icon: ClipboardList },
      { to: '/student/exams', label: 'امتحانات', icon: CalendarClock },
    ],
  },
  {
    label: 'مدرسه',
    items: [
      { to: '/student/honors', label: 'افتخارات', icon: Award },
      { to: '/student/announcements', label: 'اطلاعیه‌ها', icon: Megaphone },
      { to: '/student/calendar', label: 'تقویم مدرسه', icon: CalendarDays },
    ],
  },
  {
    label: 'حساب کاربری',
    items: [{ to: '/student/password', label: 'تغییر رمز عبور', icon: KeyRound }],
  },
];

export default function StudentPanel() {
  return (
    <PanelShell title="پنل دانش‌آموز" groups={GROUPS} accent="دانش‌آموز">
      <Routes>
        <Route index element={<StudentOverview />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="class" element={<StudentClass />} />
        <Route path="camp" element={<StudentCamp />} />
        <Route path="jenm" element={<StudentJenm />} />
        <Route path="ranking" element={<StudentRanking />} />
        <Route path="grades" element={<StudentGrades />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="honors" element={<StudentHonors />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="calendar" element={<StudentCalendar />} />
        <Route path="password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </PanelShell>
  );
}
