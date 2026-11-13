import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  GraduationCap,
  Megaphone,
  Newspaper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '../../api';
import { faNum } from '../../utils';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Feedback';
import { Reveal } from '../../components/site/Reveal';
import { IMAGES, useSiteSettings } from '../../components/site/siteData';
import { AnnouncementList, EventItem, HonorCard, NewsCard } from '../../components/site/ContentCards';

export default function Home() {
  const settings = useSiteSettings();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api('/public/classes'),
      api('/public/camps'),
      api('/public/leaderboard?scope=students'),
      api('/public/honors'),
      api('/public/news'),
      api('/public/announcements'),
      api('/public/events?upcoming=1'),
      api('/public/stats'),
    ])
      .then(([classes, camps, leaderboard, honors, news, announcements, events, stats]) => {
        if (!alive) return;
        setData({ classes, camps, leaderboard, honors, news, announcements, events, stats });
      })
      .catch(() => alive && setData({ classes: [], camps: [], leaderboard: [], honors: [], news: [], announcements: [], events: [], stats: {} }));
    return () => {
      alive = false;
    };
  }, []);

  const stats = data?.stats || {};
  const classes = data?.classes || [];
  const camps = data?.camps || [];
  const leaderboard = (data?.leaderboard || []).slice(0, 5);
  const honors = (data?.honors || []).slice(0, 3);
  const news = (data?.news || []).slice(0, 3);
  const announcements = (data?.announcements || []).slice(0, 4);
  const events = (data?.events || []).slice(0, 4);

  return (
    <>
      {/* 1. Hero */}
      <section className="hero">
        <div className="hero-media">
          <img src={IMAGES.hero} alt="نمای معماری ساختمان مدرسه فاتحان آینده" />
        </div>
        <div className="container">
          <div className="hero-content">
            <span className="eyebrow hero-kicker">مدرسه فاتحان آینده · سال تحصیلی {settings?.academicYear || '۱۴۰۴-۱۴۰۵'}</span>
            <h1>آینده را از امروز می‌سازیم</h1>
            <p>
              در مدرسه فاتحان آینده، یادگیری، تلاش، خلاقیت و پیشرفت در کنار یکدیگر قرار می‌گیرند تا نسل آینده برای
              ساختن فردایی بهتر آماده شود.
            </p>
            <div className="hero-actions">
              <Button variant="gold" to="/about">
                آشنایی با مدرسه
                <ArrowLeft />
              </Button>
              <Button variant="outline" to="/login">
                ورود به سامانه
              </Button>
            </div>
            <div className="hero-figures">
              <div>
                <strong className="num">{faNum(stats.students ?? 0)}</strong>
                <span>دانش‌آموز ثبت‌شده</span>
              </div>
              <div>
                <strong className="num">{faNum(stats.classes ?? 0)}</strong>
                <span>کلاس فعال</span>
              </div>
              <div>
                <strong className="num">{faNum(stats.camps ?? 0)}</strong>
                <span>قرارگاه آموزشی</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About */}
      <section className="section" id="about">
        <div className="container about-grid">
          <Reveal className="about-copy">
            <span className="eyebrow">درباره مدرسه</span>
            <h2>{settings?.aboutTitle || 'مدرسه فاتحان آینده'}</h2>
            <p>{settings?.aboutText}</p>
            <div className="about-points">
              <div>
                <ShieldCheck /> آموزش هدفمند و مسئولیت‌پذیر
              </div>
              <div>
                <Sparkles /> پرورش استعدادهای فردی
              </div>
              <div>
                <Users /> تقویت مهارت‌های اجتماعی
              </div>
              <div>
                <TrendingUp /> مسیر روشن پیشرفت تحصیلی
              </div>
            </div>
            <Link className="link-arrow" to="/about">
              بیشتر درباره ما بدانید <ArrowLeft />
            </Link>
          </Reveal>

          <Reveal className="about-visual" delay={120}>
            <Link to="/about" className="shot-main" aria-label="درباره مدرسه فاتحان آینده">
              <img src={IMAGES.aboutMain} alt="کلاس درس مدرن مدرسه فاتحان آینده" loading="lazy" />
            </Link>
            <Link to="/about" className="shot-narrow" aria-label="فضای آموزشی مدرسه">
              <img src={IMAGES.aboutNarrow} alt="فضای آموزشی و کلاس درس" loading="lazy" />
            </Link>
            <Link to="/about" className="round-cta" aria-label="مشاهده درباره مدرسه">
              <ArrowLeft />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 3. Classes */}
      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="container">
          <Reveal>
            <div className="between" style={{ alignItems: 'flex-end' }}>
              <div>
                <span className="eyebrow">کلاس‌های آموزشی</span>
                <h2 className="section-title">کلاس‌های مدرسه</h2>
                <p className="section-lead">
                  پنج کلاس فعال مدرسه با اطلاعات واقعی دانش‌آموزان، رتبه کلاس و مجموع امتیاز جنم.
                </p>
              </div>
              <Button variant="ghost" to="/classes">
                همه کلاس‌ها
                <ArrowLeft />
              </Button>
            </div>
          </Reveal>

          <div className="grid-5" style={{ marginTop: 32 }}>
            {(classes.length ? classes : Array.from({ length: 5 })).map((cls, index) => (
              <Reveal key={cls?.id || index} delay={index * 70}>
                {cls ? (
                  <article className="card class-card">
                    <div className="class-card-media">
                      <img src={IMAGES.classThumbs[index % IMAGES.classThumbs.length]} alt={`کلاس ${cls.code}`} loading="lazy" />
                      <span className="grade-chip">پایه {cls.grade}</span>
                    </div>
                    <div className="class-card-body">
                      <h3>کلاس {cls.code}</h3>
                      <div className="meta">
                        <span>
                          دانش‌آموزان <b className="num">{faNum(cls.students_count)}</b>
                        </span>
                        <span>
                          رتبه <b className="num">{faNum(cls.rank)}</b>
                        </span>
                      </div>
                      <div className="meta">
                        <span>
                          مجموع جنم <b className="num">{faNum(cls.total)}</b>
                        </span>
                        <span>
                          {cls.code === '7/1' ? 'هفتم' : cls.grade}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" to={`/classes/${cls.id}`}>
                        مشاهده کلاس
                        <ArrowLeft />
                      </Button>
                    </div>
                  </article>
                ) : (
                  <div className="card class-card" style={{ opacity: 0.6 }}>
                    <div className="class-card-media" />
                    <div className="class-card-body">
                      <h3>در حال بارگذاری…</h3>
                    </div>
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Camps */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="eyebrow">قرارگاه‌ها</span>
            <h2 className="section-title">پنج قرارگاه مدرسه</h2>
            <p className="section-lead">
              دانش‌آموزان در پنج قرارگاه سازمان‌دهی می‌شوند و امتیاز جنم هر قرارگاه از مجموع امتیاز اعضای آن محاسبه
              می‌شود.
            </p>
          </Reveal>
          <div className="grid-5" style={{ marginTop: 32 }}>
            {camps.map((camp, index) => (
              <Reveal key={camp.id} delay={index * 60}>
                <article className="card camp-card" style={{ '--camp-color': camp.color }}>
                  <div className="between">
                    <span className="camp-logo">{faNum(camp.slot)}</span>
                    {camp.name ? (
                      <span className="pill pill-gold">رتبه {faNum(camp.rank)}</span>
                    ) : (
                      <span className="pill pill-gray">در انتظار نام‌گذاری</span>
                    )}
                  </div>
                  <h3>{camp.name || 'نام قرارگاه توسط مدیر تعیین می‌شود'}</h3>
                  <div className="camp-stats">
                    <div>
                      <b className="num">{faNum(camp.students_count)}</b>
                      دانش‌آموز
                    </div>
                    <div>
                      <b className="num">{faNum(camp.total)}</b>
                      امتیاز جنم
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" to={`/camps/${camp.id}`}>
                    مشاهده قرارگاه
                  </Button>
                </article>
              </Reveal>
            ))}
            {camps.length === 0 ? (
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <EmptyState title="قرارگاه‌ها در حال آماده‌سازی هستند" description="فهرست قرارگاه‌ها از پایگاه داده بارگذاری می‌شود." />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 5. Jenm & ranking preview */}
      <section className="section" style={{ background: 'var(--cream)' }}>
        <div className="container grid-2">
          <Reveal>
            <div className="card card-pad" style={{ height: '100%' }}>
              <div className="between">
                <div>
                  <span className="eyebrow">سیستم امتیاز جنم</span>
                  <h2 style={{ fontSize: 24, color: 'var(--navy-800)', marginTop: 8 }}>رتبه‌بندی زنده دانش‌آموزان</h2>
                  <p className="small muted" style={{ marginTop: 8 }}>
                    رتبه‌ها به‌صورت خودکار بر اساس مجموع امتیاز جنم ثبت‌شده در پایگاه داده محاسبه می‌شوند.
                  </p>
                </div>
                <TrendingUp style={{ color: 'var(--gold-600)' }} />
              </div>
              <div className="rank-list" style={{ marginTop: 22 }}>
                {leaderboard.length === 0 ? (
                  <EmptyState
                    title="هنوز امتیازی ثبت نشده است"
                    description="امتیاز اولیه همه دانش‌آموزان صفر است؛ پس از ثبت نخستین امتیاز، رتبه‌بندی در همین بخش نمایش داده می‌شود."
                    icon={TrendingUp}
                  />
                ) : (
                  leaderboard.map((row) => (
                    <div className="rank-item" key={row.id}>
                      <span className="rank-badge num">{faNum(row.rank)}</span>
                      <span className="name">
                        {row.fullName}
                        <span className="tiny muted" style={{ display: 'block', fontWeight: 400 }}>
                          {row.className || 'بدون کلاس'}
                        </span>
                      </span>
                      <span className="score num">{faNum(row.total)}</span>
                    </div>
                  ))
                )}
              </div>
              <Link className="link-arrow" to="/login" style={{ marginTop: 18 }}>
                مشاهده رتبه‌بندی کامل در سامانه ←
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="card card-pad" style={{ height: '100%' }}>
              <div className="between">
                <div>
                  <span className="eyebrow">افتخارات</span>
                  <h2 style={{ fontSize: 24, color: 'var(--navy-800)', marginTop: 8 }}>افتخارات اخیر مدرسه</h2>
                </div>
                <Award style={{ color: 'var(--gold-600)' }} />
              </div>
              <div className="stack gap-12" style={{ marginTop: 22 }}>
                {honors.length === 0 ? (
                  <EmptyState
                    title="افتخاری ثبت نشده است"
                    description="افتخارات دانش‌آموزان پس از ثبت توسط مدیر مدرسه در همین بخش منتشر می‌شود."
                    icon={Award}
                  />
                ) : (
                  honors.map((honor) => <HonorCard key={honor.id} item={honor} />)
                )}
              </div>
              <Link className="link-arrow" to="/honors" style={{ marginTop: 18 }}>
                همه افتخارات ←
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. News & announcements */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="between" style={{ alignItems: 'flex-end' }}>
              <div>
                <span className="eyebrow">اخبار و اطلاعیه‌ها</span>
                <h2 className="section-title">آخرین خبرهای مدرسه</h2>
              </div>
              <Button variant="ghost" to="/news">
                همه اخبار
                <ArrowLeft />
              </Button>
            </div>
          </Reveal>
          <div className="grid-3" style={{ marginTop: 30 }}>
            {news.length === 0 ? (
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon={Newspaper}
                  title="هنوز خبری منتشر نشده است"
                  description="خبرها و رویدادهای مدرسه از سوی مدیر منتشر می‌شوند و در همین بخش نمایش داده می‌شوند."
                />
              </div>
            ) : (
              news.map((item, index) => (
                <Reveal key={item.id} delay={index * 80}>
                  <NewsCard item={item} />
                </Reveal>
              ))
            )}
          </div>
          <div className="card card-pad" style={{ marginTop: 24 }}>
            <div className="between" style={{ marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, color: 'var(--navy-800)' }}>
                <Megaphone size={16} style={{ verticalAlign: '-3px', marginInlineEnd: 6, color: 'var(--gold-600)' }} />
                اطلاعیه‌های عمومی
              </h3>
            </div>
            <AnnouncementList items={announcements} />
          </div>
        </div>
      </section>

      {/* 7. Events */}
      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="container">
          <Reveal>
            <div className="between" style={{ alignItems: 'flex-end' }}>
              <div>
                <span className="eyebrow">تقویم مدرسه</span>
                <h2 className="section-title">رویدادهای پیش‌رو</h2>
              </div>
              <CalendarDays style={{ color: 'var(--gold-600)' }} />
            </div>
          </Reveal>
          <div className="grid-2" style={{ marginTop: 28 }}>
            {events.length === 0 ? (
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon={CalendarDays}
                  title="رویدادی در تقویم ثبت نشده است"
                  description="برنامه‌ها، آزمون‌ها و مهلت‌های مهم پس از ثبت توسط مدیر در تقویم مدرسه نمایش داده می‌شوند."
                />
              </div>
            ) : (
              events.map((event) => <EventItem key={event.id} item={event} />)
            )}
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section className="section-tight">
        <div className="container">
          <Reveal className="cta-panel">
            <div className="cta-inner">
              <span className="cta-icon">
                <GraduationCap />
              </span>
              <div style={{ flex: 1 }}>
                <h2>{settings?.ctaTitle || 'آینده‌ای درخشان از همین‌جا آغاز می‌شود'}</h2>
                <p>
                  {settings?.ctaText ||
                    'با ورود به سامانه مدرسه فاتحان آینده، مسیر پیشرفت تحصیلی و افتخارات خود را دنبال کنید.'}
                </p>
                <div className="cta-actions">
                  <Button variant="primary" to="/login">
                    ورود به سامانه
                  </Button>
                  <Button variant="ghost" to="/contact">
                    <Building2 />
                    ارتباط با مدرسه
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
