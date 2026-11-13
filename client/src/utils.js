const faNumber = new Intl.NumberFormat('fa-IR');
const dateLong = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric', month: 'long', year: 'numeric' });
const dateShort = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric', month: 'long' });
const weekday = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', weekday: 'long' });
const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });

export const faNum = (value) => {
  if (value === null || value === undefined || value === '') return '۰';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return faNumber.format(num);
};

export const faScore = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return faNumber.format(Number.isInteger(num) ? num : num.toFixed(2).replace(/\.?0+$/, ''));
};

export const faDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateLong.format(d);
};

export const faDateShort = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateShort.format(d);
};

export const faWeekday = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return weekday.format(d);
};

export const faTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return timeFmt.format(d);
};

export const faDateTime = (value) => `${faDate(value)} — ${faTime(value)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const initials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('');

export const roleLabel = (role) =>
  ({ admin: 'مدیر مدرسه', teacher: 'معلم', student: 'دانش‌آموز' })[role] || role;

export const PERMISSION_LABELS = {
  can_grade: 'ثبت و ویرایش نمره',
  can_exams: 'ایجاد امتحان',
  can_jenm: 'ثبت امتیاز جنم',
  can_announce: 'انتشار اطلاعیه کلاسی',
  can_view_reports: 'مشاهده گزارش‌های آموزشی',
};

export const announcementCategoryLabel = (category) =>
  ({
    public: 'اطلاعیه عمومی',
    class: 'اطلاعیه کلاسی',
    camp: 'اطلاعیه قرارگاهی',
    teachers: 'ویژه معلمان',
    admin: 'مدیریتی',
  })[category] || category;

export const newsCategoryLabel = (category) =>
  ({
    school: 'اخبار مدرسه',
    events: 'رویدادها',
    competitions: 'مسابقات',
    honors: 'افتخارات',
    general: 'اطلاعیه‌های عمومی',
  })[category] || category;

export const eventTypeLabel = (type) =>
  ({ exam: 'آزمون', school: 'برنامه مدرسه', deadline: 'مهلت مهم', class: 'رویداد کلاسی', event: 'رویداد' })[type] || type;
