import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, patch } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: '', guardianName: '', guardianPhone: '', address: '' });
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/student/me')
      .then((data) => {
        setProfile(data);
        setForm({
          phone: data.phone || '',
          guardianName: data.guardianName || '',
          guardianPhone: data.guardianPhone || '',
          address: data.address || '',
        });
      })
      .catch((err) => setState({ error: err.message, success: '' }));
  }, []);

  if (!profile) return <Spinner />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      await patch('/student/me', form);
      setState({ error: '', success: 'اطلاعات تماس شما ذخیره شد.' });
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <SectionCard title="اطلاعات تحصیلی">
        <div className="stack gap-12">
          {[
            ['نام و نام خانوادگی', profile.fullName],
            ['کد دانش‌آموزی', profile.studentCode],
            ['نام کاربری', profile.username],
            ['کلاس', profile.className],
            ['پایه تحصیلی', profile.grade],
            ['قرارگاه', profile.campName || 'تعیین نشده'],
          ].map(([label, value]) => (
            <div key={label} className="between" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 8 }}>
              <span className="small muted">{label}</span>
              <strong style={{ fontSize: 13.5, color: 'var(--navy-800)' }} className={label === 'کد دانش‌آموزی' || label === 'نام کاربری' ? 'ltr' : ''}>
                {value || '—'}
              </strong>
            </div>
          ))}
        </div>
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          نام، کلاس و قرارگاه فقط توسط مدیر مدرسه قابل تغییر است. شما می‌توانید اطلاعات تماس خود را ویرایش کنید.
        </div>
      </SectionCard>

      <SectionCard title="ویرایش اطلاعات تماس">
        <form onSubmit={submit} className="stack gap-12">
          <Alert kind="error">{state.error}</Alert>
          <Alert kind="success">{state.success}</Alert>
          <Input
            label="شماره تماس دانش‌آموز"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="۰۹۱۲…"
            className="ltr"
          />
          <Input
            label="نام سرپرست"
            value={form.guardianName}
            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
          />
          <Input
            label="شماره تماس سرپرست"
            value={form.guardianPhone}
            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
            className="ltr"
          />
          <Field label="نشانی">
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="نشانی محل سکونت"
            />
          </Field>
          <div>
            <Button type="submit" variant="primary" disabled={busy}>
              <Save />
              {busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
