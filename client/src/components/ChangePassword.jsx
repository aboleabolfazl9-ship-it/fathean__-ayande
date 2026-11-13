import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../api';
import { Alert } from './ui/Feedback';
import { Button } from './ui/Button';
import { Field } from './ui/Form';
import { SectionCard } from './ui/Stat';

export function ChangePassword() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    if (newPassword !== confirm) {
      setState({ error: 'تکرار رمز عبور با رمز جدید یکسان نیست.', success: '' });
      return;
    }
    setBusy(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setState({ error: '', success: 'رمز عبور با موفقیت تغییر کرد.' });
      setCurrent('');
      setNew('');
      setConfirm('');
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionCard title="تغییر رمز عبور">
        <form onSubmit={submit} className="stack gap-12">
          <Alert kind="error">{state.error}</Alert>
          <Alert kind="success">{state.success}</Alert>
          <Field label="رمز عبور فعلی">
            <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="رمز عبور جدید" hint="حداقل ۸ نویسه و شامل حرف و رقم.">
            <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required autoComplete="new-password" />
          </Field>
          <Field label="تکرار رمز عبور جدید">
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </Field>
          <div>
            <Button type="submit" variant="primary" disabled={busy}>
              <KeyRound />
              {busy ? 'در حال ذخیره…' : 'ذخیره رمز عبور'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
