import { Link } from 'react-router-dom';
import { GraduationCap, Mail, MapPin, Phone, Instagram, Send, MessageCircle } from 'lucide-react';
import { useSiteSettings } from './siteData';

const LINKS = [
  { to: '/', label: 'صفحه اصلی' },
  { to: '/about', label: 'درباره مدرسه' },
  { to: '/classes', label: 'کلاس‌ها' },
  { to: '/camps', label: 'قرارگاه‌ها' },
  { to: '/honors', label: 'افتخارات' },
  { to: '/news', label: 'اخبار' },
  { to: '/contact', label: 'ارتباط با ما' },
];

export function SiteFooter() {
  const settings = useSiteSettings();
  const contact = settings?.contact || {};
  const social = settings?.social || {};
  const year = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', year: 'numeric' }).format(new Date());

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="row gap-12">
              <span className="brand-mark">
                <GraduationCap />
              </span>
              <div>
                <strong style={{ color: '#fff', fontSize: 16 }}>{settings?.schoolName || 'مدرسه فاتحان آینده'}</strong>
                <div className="tiny" style={{ color: 'var(--gold-500)', letterSpacing: '0.14em' }}>
                  FATEHAN AYANDEH SCHOOL
                </div>
              </div>
            </div>
            <p>
              محیطی برای رشد علمی، پرورش استعدادها و تقویت مهارت‌های فردی و اجتماعی دانش‌آموزان؛ همراه با آموزش
              هدفمند، تلاش و مسئولیت‌پذیری.
            </p>
            <div className="social-row">
              {social.instagram ? (
                <a href={social.instagram} aria-label="اینستاگرام مدرسه">
                  <Instagram />
                </a>
              ) : null}
              {social.telegram ? (
                <a href={social.telegram} aria-label="تلگرام مدرسه">
                  <Send />
                </a>
              ) : null}
              {social.whatsapp ? (
                <a href={social.whatsapp} aria-label="واتس‌اپ مدرسه">
                  <MessageCircle />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h4>دسترسی سریع</h4>
            {LINKS.slice(0, 4).map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>

          <div>
            <h4>سامانه</h4>
            <Link to="/login">ورود به سامانه</Link>
            <Link to="/login?tab=register">فعال‌سازی حساب</Link>
            <Link to="/news">اخبار و اطلاعیه‌ها</Link>
            <Link to="/contact">ارتباط با مدرسه</Link>
          </div>

          <div className="footer-contact">
            <h4>اطلاعات تماس</h4>
            {contact.phone ? (
              <div>
                <Phone /> <span className="ltr">{contact.phone}</span>
              </div>
            ) : (
              <div>
                <Phone /> <span>شماره تماس توسط مدیر مدرسه تکمیل می‌شود.</span>
              </div>
            )}
            {contact.email ? (
              <div>
                <Mail /> <span className="ltr">{contact.email}</span>
              </div>
            ) : (
              <div>
                <Mail /> <span>ایمیل مدرسه به‌زودی از سوی مدیر ثبت می‌شود.</span>
              </div>
            )}
            {contact.address ? (
              <div>
                <MapPin /> <span>{contact.address}</span>
              </div>
            ) : (
              <div>
                <MapPin /> <span>نشانی مدرسه توسط مدیر مدرسه تکمیل می‌شود.</span>
              </div>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {year} — {settings?.copyright || 'تمامی حقوق برای مدرسه فاتحان آینده محفوظ است.'}
          </span>
          <span>سال تحصیلی {settings?.academicYear || '۱۴۰۴-۱۴۰۵'}</span>
        </div>
      </div>
    </footer>
  );
}
