import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X, UserRound } from 'lucide-react';
import { useAuth } from '../../auth';

const NAV = [
  { to: '/', label: 'صفحه اصلی', end: true },
  { to: '/about', label: 'درباره مدرسه' },
  { to: '/classes', label: 'کلاس‌ها' },
  { to: '/camps', label: 'قرارگاه‌ها' },
  { to: '/honors', label: 'افتخارات' },
  { to: '/news', label: 'اخبار و اطلاعیه‌ها' },
  { to: '/contact', label: 'ارتباط با ما' },
];

const panelPath = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const headerClass = ['site-header', scrolled ? 'scrolled' : '', !isHome ? 'solid' : ''].filter(Boolean).join(' ');

  return (
    <>
      <header className={headerClass}>
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="مدرسه فاتحان آینده — صفحه اصلی">
            <span className="brand-mark">
              <GraduationCap />
            </span>
            <span className="brand-text">
              <strong>فاتحان آینده</strong>
              <span>FATEHAN AYANDEH SCHOOL</span>
            </span>
          </Link>

          <nav className="nav-desktop" aria-label="منوی اصلی">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            {user ? (
              <Link className="btn btn-gold" to={panelPath(user.role)}>
                <UserRound />
                پنل من
              </Link>
            ) : (
              <>
                <Link className="btn btn-ghost header-login" to="/login">
                  ورود
                </Link>
                <Link className="btn btn-primary" to="/login?tab=register">
                  ثبت‌نام / حساب کاربری
                </Link>
              </>
            )}
            <button
              type="button"
              className="menu-toggle"
              aria-label="باز کردن منو"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="منوی موبایل">
          <button type="button" className="menu-toggle mobile-menu-close" aria-label="بستن منو" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link className="btn btn-primary btn-block" to={panelPath(user.role)} onClick={() => setMenuOpen(false)}>
              ورود به پنل من
            </Link>
          ) : (
            <>
              <Link className="btn btn-primary btn-block" to="/login" onClick={() => setMenuOpen(false)}>
                ورود به سامانه
              </Link>
              <Link className="btn btn-ghost btn-block" to="/login?tab=register" onClick={() => setMenuOpen(false)}>
                فعال‌سازی حساب با کد دعوت
              </Link>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
