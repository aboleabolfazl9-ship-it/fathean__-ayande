import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth';
import { api } from '../../api';
import { Alert } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { roleLabel } from '../../utils';

const panelPath = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');

export default function Login() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'register' ? 'register' : 'login';
  const { user, login, redeemInvite } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteCheck, setInviteCheck] = useState(null);

  useEffect(() => {
    if (user) navigate(panelPath(user.role), { replace: true });
  }, [user, navigate]);

  const switchTab = (next) => {
    setError('');
    setInfo('');
    setParams(next === 'register' ? { tab: 'register' } : {});
  };

  const onLogin = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await login(identifier.trim(), password);
      navigate(panelPath(data.user.role), { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.payload?.needsInvite) {
        setInfo('این حساب هنوز فعال نشده است؛ از تب «فعال‌سازی حساب» و کد دعوت مدرسه استفاده کنید.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onRedeem = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    if (password !== confirm) {
      setError('تکرار رمز عبور با رمز وارد‌شده یکسان نیست.');
      return;
    }
    setBusy(true);
    try {
      const data = await redeemInvite(identifier.trim(), code.trim(), password);
      navigate(panelPath(data.user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const checkInvite = async () => {
    if (!identifier.trim()) {
      setError('ابتدا نام کاربری خود را وارد کنید.');
      return;
    }
    setError('');
    try {
      const data = await api(`/auth/invite-info?identifier=${encodeURIComponent(identifier.trim())}`);
      if (!data.found) {
        setInviteCheck({ state: 'notfound' });
        return;
      }
      setInviteCheck({
        state: data.hasOpenInvite ? 'open' : 'closed',
        fullName: data.fullName,
        role: data.role,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <Link to="/" className="brand" style={{ color: '#fff' }}>
          <span className="brand-mark">
            <GraduationCap />
          </span>
          <span className="brand-text">
            <strong>فاتحان آینده</strong>
            <span>FATEHAN AYANDEH SCHOOL</span>
          </span>
        </Link>
        <div>
          <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>
            سامانه مدیریت آموزشی
          </span>
          <h2 style={{ marginTop: 16 }}>آینده‌ای درخشان از همین‌جا آغاز می‌شود</h2>
          <p>
            با ورود به سامانه، امتیاز جنم، نمرات، امتحانات، اطلاعیه‌ها و رتبه‌بندی خود را در یک محیط یکپارچه دنبال
            کنید.
          </p>
        </div>
        <div className="small" style={{ color: 'rgba(255,255,255,.55)' }}>
          <ShieldCheck size={15} style={{ verticalAlign: '-3px', marginInlineEnd: 6 }} />
          دسترسی هر کاربر بر اساس نقش او در سمت سرور بررسی می‌شود.
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button type="button" className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
              ورود به سامانه
            </button>
            <button
              type="button"
              className={`tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
            >
              فعال‌سازی حساب
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={onLogin} className="stack gap-4">
              <h1>ورود به حساب کاربری</h1>
              <p className="sub">نام کاربری دریافتی از مدرسه و رمز عبور خود را وارد کنید.</p>
              <Alert kind="error">{error}</Alert>
              {info ? <Alert kind="info">{info}</Alert> : null}
              <Input
                label="نام کاربری یا ایمیل"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="مثلاً f71-01"
                required
              />
              <Field label="رمز عبور">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Button type="submit" variant="primary" className="btn-block" disabled={busy}>
                <LogIn />
                {busy ? 'در حال ورود…' : 'ورود'}
              </Button>
              <p className="auth-footnote">
                حساب کاربری توسط مدرسه ایجاد می‌شود. اگر رمز عبور خود را فراموش کرده‌اید، از مدیر مدرسه کد دعوت جدید
                بخواهید.
              </p>
            </form>
          ) : (
            <form onSubmit={onRedeem} className="stack gap-4">
              <h1>فعال‌سازی حساب</h1>
              <p className="sub">
                برای نخستین ورود، نام کاربری و کد دعوت یک‌بارمصرفی که مدیر مدرسه برای شما صادر کرده است را وارد کنید و
                رمز عبور شخصی خود را تعیین کنید.
              </p>
              <Alert kind="error">{error}</Alert>
              <div className="row gap-8" style={{ alignItems: 'flex-end' }}>
                <Input
                  label="نام کاربری"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setInviteCheck(null);
                  }}
                  placeholder="مثلاً f71-01"
                  required
                  style={{ flex: 1 }}
                />
                <Button type="button" variant="ghost" onClick={checkInvite} style={{ marginBottom: 1 }}>
                  بررسی
                </Button>
              </div>
              {inviteCheck?.state === 'open' ? (
                <Alert kind="success">
                  حساب «{inviteCheck.fullName}» ({roleLabel(inviteCheck.role)}) کد دعوت فعال دارد.
                </Alert>
              ) : null}
              {inviteCheck?.state === 'closed' ? (
                <Alert kind="warn">برای این حساب کد دعوت فعالی وجود ندارد. از مدیر مدرسه کد جدید بخواهید.</Alert>
              ) : null}
              {inviteCheck?.state === 'notfound' ? <Alert kind="error">حسابی با این نام کاربری یافت نشد.</Alert> : null}
              <Input
                label="کد دعوت"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="۸ نویسه، مثلاً K7M2PQX4"
                className="ltr"
                required
              />
              <Field label="رمز عبور جدید" hint="حداقل ۸ نویسه و شامل حرف و رقم.">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="تکرار رمز عبور">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Button type="submit" variant="primary" className="btn-block" disabled={busy}>
                <KeyRound />
                {busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی و ورود'}
              </Button>
            </form>
          )}
          <p className="auth-footnote">
            <Link to="/" className="link-arrow" style={{ justifyContent: 'center', width: '100%' }}>
              بازگشت به صفحه اصلی مدرسه ←
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
