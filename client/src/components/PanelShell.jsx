import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../auth';
import { initials, roleLabel } from '../utils';

const panelHome = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');

export function PanelShell({ title, groups, accent = 'دانش‌آموز', children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="panel">
      <aside className={`panel-side ${open ? 'open' : ''}`} aria-label="منوی پنل">
        <Link to={panelHome(user?.role)} className="brand">
          <span className="brand-mark">
            <GraduationCap />
          </span>
          <span className="brand-text">
            <strong>فاتحان آینده</strong>
            <span style={{ fontSize: 9.5 }}>پنل {accent}</span>
          </span>
        </Link>
        <button
          type="button"
          className="menu-toggle mobile-only"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
          style={{ marginBottom: 10, color: '#fff' }}
        >
          <X />
        </button>
        <nav>
          {groups.map((group) => (
            <div key={group.label || 'main'}>
              {group.label ? <div className="side-group">{group.label}</div> : null}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <button type="button" className="nav-item" onClick={onLogout} style={{ width: '100%' }}>
            <LogOut />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      <div className="panel-main">
        <header className="panel-top">
          <div className="row gap-8">
            <button type="button" className="menu-toggle mobile-only" onClick={() => setOpen(true)} aria-label="باز کردن منو">
              <Menu />
            </button>
            <h1>{title}</h1>
          </div>
          <div className="who">
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--navy-800)' }}>{user?.fullName}</strong>
              <span className="tiny muted">{roleLabel(user?.role)}</span>
            </div>
            <span className="avatar">{initials(user?.fullName)}</span>
          </div>
        </header>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}
