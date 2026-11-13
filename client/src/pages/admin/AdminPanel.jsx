import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  School,
  GraduationCap,
  Flag,
  Sparkles,
  Trophy,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Award,
  Newspaper,
  Megaphone,
  CalendarDays,
  UserCog,
  BarChart3,
  Settings,
  KeyRound,
} from 'lucide-react';
import { PanelShell } from '../../components/PanelShell';
import { ChangePassword } from '../../components/ChangePassword';
import AdminOverview from './AdminOverview';
import AdminStudents from './AdminStudents';
import AdminClasses from './AdminClasses';
import AdminTeachers from './AdminTeachers';
import AdminCamps from './AdminCamps';
import AdminJenm from './AdminJenm';
import AdminRanking from './AdminRanking';
import AdminSubjects from './AdminSubjects';
import AdminExams from './AdminExams';
import AdminGrades from './AdminGrades';
import AdminHonors from './AdminHonors';
import AdminNews from './AdminNews';
import AdminAnnouncements from './AdminAnnouncements';
import AdminCalendar from './AdminCalendar';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminSettings from './AdminSettings';

const GROUPS = [
  {
    items: [{ to: '/admin', label: 'نمای کلی', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'مدیریت مدرسه',
    items: [
      { to: '/admin/students', label: 'مدیریت دانش‌آموزان', icon: Users },
      { to: '/admin/classes', label: 'مدیریت کلاس‌ها', icon: School },
      { to: '/admin/teachers', label: 'مدیریت معلمان', icon: GraduationCap },
      { to: '/admin/camps', label: 'مدیریت قرارگاه‌ها', icon: Flag },
    ],
  },
  {
    label: 'جنم و رتبه‌بندی',
    items: [
      { to: '/admin/jenm', label: 'مدیریت جنم', icon: Sparkles },
      { to: '/admin/ranking', label: 'رتبه‌بندی', icon: Trophy },
    ],
  },
  {
    label: 'امور آموزشی',
    items: [
      { to: '/admin/subjects', label: 'مدیریت دروس', icon: BookOpen },
      { to: '/admin/exams', label: 'مدیریت امتحانات', icon: CalendarClock },
      { to: '/admin/grades', label: 'مدیریت نمرات', icon: ClipboardList },
    ],
  },
  {
    label: 'محتوا و اطلاع‌رسانی',
    items: [
      { to: '/admin/honors', label: 'افتخارات', icon: Award },
      { to: '/admin/news', label: 'اخبار', icon: Newspaper },
      { to: '/admin/announcements', label: 'اطلاعیه‌ها', icon: Megaphone },
      { to: '/admin/calendar', label: 'تقویم', icon: CalendarDays },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { to: '/admin/users', label: 'مدیریت کاربران', icon: UserCog },
      { to: '/admin/reports', label: 'گزارش‌ها', icon: BarChart3 },
      { to: '/admin/settings', label: 'تنظیمات سایت', icon: Settings },
      { to: '/admin/account', label: 'تنظیمات حساب', icon: KeyRound },
    ],
  },
];

export default function AdminPanel() {
  return (
    <PanelShell title="پنل مدیریت مدرسه" groups={GROUPS} accent="مدیر">
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="camps" element={<AdminCamps />} />
        <Route path="jenm" element={<AdminJenm />} />
        <Route path="ranking" element={<AdminRanking />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="grades" element={<AdminGrades />} />
        <Route path="honors" element={<AdminHonors />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="account" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </PanelShell>
  );
}
