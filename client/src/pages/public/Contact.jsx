import { Mail, MapPin, Phone, Send, Instagram, MessageCircle, Clock } from 'lucide-react';
import { useSiteSettings } from '../../components/site/siteData';

export default function Contact() {
  const settings = useSiteSettings();
  const contact = settings?.contact || {};
  const social = settings?.social || {};
  const rows = [
    { icon: Phone, label: 'شماره تلفن', value: contact.phone, ltr: true },
    { icon: Mail, label: 'ایمیل', value: contact.email, ltr: true },
    { icon: MapPin, label: 'نشانی مدرسه', value: contact.address },
    { icon: Clock, label: 'ساعات پاسخ‌گویی', value: contact.officeHours },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">ارتباط با ما</span>
          <h1>در ارتباط با مدرسه فاتحان آینده</h1>
          <p>اطلاعات تماس رسمی مدرسه در این بخش نمایش داده می‌شود و توسط مدیر مدرسه به‌روزرسانی می‌گردد.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-2">
          <div className="card card-pad">
            <h2 style={{ fontSize: 18, color: 'var(--navy-800)', marginBottom: 6 }}>اطلاعات تماس</h2>
            <p className="small muted" style={{ marginBottom: 18 }}>
              در صورت نیاز به هماهنگی جلسه، از طریق شماره تماس رسمی مدرسه اقدام کنید.
            </p>
            <div className="stack gap-12">
              {rows.map((row) => (
                <div key={row.label} className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <span className="honor-icon" style={{ width: 38, height: 38, borderRadius: 10 }}>
                    <row.icon size={17} />
                  </span>
                  <div>
                    <div className="tiny muted">{row.label}</div>
                    <div className={row.ltr ? 'ltr' : ''} style={{ fontWeight: 600, color: 'var(--navy-800)', fontSize: 14 }}>
                      {row.value || 'توسط مدیر مدرسه تکمیل می‌شود'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <h2 style={{ fontSize: 18, color: 'var(--navy-800)', marginBottom: 6 }}>شبکه‌های اجتماعی</h2>
            <p className="small muted" style={{ marginBottom: 18 }}>
              صفحات رسمی مدرسه پس از ثبت لینک توسط مدیر، در این بخش در دسترس قرار می‌گیرد.
            </p>
            <div className="stack gap-12">
              {[
                { key: 'instagram', label: 'اینستاگرام', icon: Instagram },
                { key: 'telegram', label: 'تلگرام', icon: Send },
                { key: 'whatsapp', label: 'واتس‌اپ', icon: MessageCircle },
              ].map((item) => (
                <div key={item.key} className="between" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 10 }}>
                  <span className="row gap-8 small" style={{ fontWeight: 600 }}>
                    <item.icon size={16} style={{ color: 'var(--gold-600)' }} /> {item.label}
                  </span>
                  {social[item.key] ? (
                    <a href={social[item.key]} className="link-arrow" target="_blank" rel="noreferrer">
                      مشاهده صفحه ←
                    </a>
                  ) : (
                    <span className="tiny muted">ثبت نشده</span>
                  )}
                </div>
              ))}
            </div>
            <div className="alert alert-info" style={{ marginTop: 20 }}>
              برای پیگیری وضعیت تحصیلی، امتیاز جنم و اطلاعیه‌ها از حساب کاربری خود در سامانه استفاده کنید.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
