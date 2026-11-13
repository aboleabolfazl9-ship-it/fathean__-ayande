import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, patch } from '../../api';
import { Spinner, Alert } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';

export default function TeacherProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: '', field: '' });
  const [state, setState] = useState({ error: '', success: '' });

  useEffect(() => {
    api('/teacher/profile')
      .then((data) => {
        setProfile(data);
        setForm({ phone: data.phone || '', field: data.field || '' });
      })
      .catch((err) => setState({ error: err.message, success: '' }));
  }, []);

  if (!profile) return state.error ? <Alert kind="error">{state.error}</Alert> : <Spinner />;

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '' });
    try {
      await patch('/teacher/profile', form);
      setState({ error: '', success: 'پروفایل ذخیره شد.' });
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <SectionCard title="اطلاعات حساب">
        <div className="stack gap-12">
          <div className="between" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 8 }}>
            <span className="small muted">نام و نام خانوادگی</span>
            <strong style={{ fontSize: 13.5, color: 'var(--navy-800)' }}>{profile.full_name}</strong>
          </div>
          <div className="between" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 8 }}>
            <span className="small muted">نام کاربری</span>
            <strong className="ltr" style={{ fontSize: 13.5, color: 'var(--navy-800)' }}>{profile.username}</strong>
          </div>
          <div className="between" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 8 }}>
            <span className="small muted">ایمیل</span>
            <strong className="ltr" style={{ fontSize: 13.5, color: 'var(--navy-800)' }}>{profile.email || '—'}</strong>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="ویرایش پروفایل">
        <form onSubmit={submit} className="stack gap-12">
          <Alert kind="error">{state.error}</Alert>
          <Alert kind="success">{state.success}</Alert>
          <Input label="درس تخصصی" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
          <Input label="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ltr" />
          <Button type="submit" variant="primary">
            <Save /> ذخیره
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
