import { ArrowLeft, Award, BookOpen, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Reveal } from '../../components/site/Reveal';
import { IMAGES, useSiteSettings } from '../../components/site/siteData';

const VALUES = [
  { icon: BookOpen, title: 'آموزش هدفمند', text: 'برنامه‌ریزی درسی منظم و پیگیری مستمر پیشرفت تحصیلی هر دانش‌آموز.' },
  { icon: Sparkles, title: 'پرورش استعداد', text: 'شناسایی و شکوفایی توانایی‌های فردی در محیطی امن و پرانگیزه.' },
  { icon: Users, title: 'مهارت اجتماعی', text: 'تقویت مسئولیت‌پذیری، همکاری و احترام متقابل در فعالیت‌های گروهی.' },
  { icon: ShieldCheck, title: 'فضای قابل اعتماد', text: 'ارتباط شفاف مدرسه، دانش‌آموز و خانواده با اطلاعات دقیق و به‌روز.' },
];

export default function About() {
  const settings = useSiteSettings();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">درباره مدرسه</span>
          <h1>مدرسه فاتحان آینده</h1>
          <p>{settings?.aboutText}</p>
        </div>
      </section>

      <section className="section">
        <div className="container about-grid">
          <Reveal>
            <span className="eyebrow">هویت آموزشی</span>
            <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', color: 'var(--navy-800)', margin: '12px 0 16px' }}>
              مسیری روشن برای ساختن آینده
            </h2>
            <p style={{ color: 'var(--ink-soft)' }}>
              مدرسه فاتحان آینده با تمرکز بر یادگیری عمیق، نظم آموزشی و همراهی خانواده، بستری فراهم می‌کند تا هر
              دانش‌آموز بتواند توانایی‌های خود را بشناسد و در مسیر پیشرفت گام بردارد.
            </p>
            <p style={{ color: 'var(--ink-soft)', marginTop: 14 }}>
              در این مدرسه، سه پایه تحصیلی هفتم، هشتم و نهم در پنج کلاس سازمان‌دهی شده‌اند و تمام اطلاعات آموزشی،
              امتیاز جنم، افتخارات و اطلاعیه‌ها در یک سامانه یکپارچه ثبت و پیگیری می‌شود.
            </p>
            <div style={{ marginTop: 26 }}>
              <Button variant="primary" to="/classes">
                مشاهده کلاس‌ها
                <ArrowLeft />
              </Button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)', height: 380 }}>
              <img src={IMAGES.aboutMain} alt="کلاس درس مدرسه فاتحان آینده" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream)' }}>
        <div className="container">
          <span className="eyebrow">ارزش‌های ما</span>
          <h2 className="section-title">آنچه در فاتحان آینده می‌سازیم</h2>
          <div className="grid-4" style={{ marginTop: 30 }}>
            {VALUES.map((value, index) => (
              <Reveal key={value.title} delay={index * 70} className="card card-pad">
                <value.icon size={22} style={{ color: 'var(--gold-600)' }} />
                <h3 style={{ fontSize: 15.5, color: 'var(--navy-800)', margin: '12px 0 6px' }}>{value.title}</h3>
                <p className="small muted">{value.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <div className="cta-inner">
              <span className="cta-icon">
                <GraduationCap />
              </span>
              <div style={{ flex: 1 }}>
                <h2>مدرسه‌ای برای نسل آینده</h2>
                <p>برای مشاهده اطلاعات کلاس‌ها، قرارگاه‌ها و افتخارات به بخش‌های مربوطه مراجعه کنید.</p>
                <div className="cta-actions">
                  <Button variant="primary" to="/camps">
                    قرارگاه‌ها
                  </Button>
                  <Button variant="ghost" to="/honors">
                    <Award /> افتخارات
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
