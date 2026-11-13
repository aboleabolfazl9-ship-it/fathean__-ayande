import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, patch } from '../../api';
import { Spinner, Alert } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/admin/settings').then(setForm).catch((err) => setState({ error: err.message, success: '' }));
  }, []);

  if (!form) return <Spinner />;

  const set = (key, value) => setForm({ ...form, [key]: value });
  const setContact = (key, value) => setForm({ ...form, contact: { ...form.contact, [key]: value } });
  const setSocial = (key, value) => setForm({ ...form, social: { ...form.social, [key]: value } });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      const result = await patch('/admin/settings', form);
      setForm(result);
      setState({ error: '', success: 'تنظیمات سایت ذخیره شد.' });
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack gap-16">
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>

      <SectionCard title="هویت مدرسه">
        <div className="form-grid">
          <Input label="نام مدرسه" value={form.schoolName || ''} onChange={(e) => set('schoolName', e.target.value)} />
          <Input label="شعار" value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} />
          <Input label="سال تحصیلی" value={form.academicYear || ''} onChange={(e) => set('academicYear', e.target.value)} />
          <Input label="متن کپی‌رایت" value={form.copyright || ''} onChange={(e) => set('copyright', e.target.value)} />
          <Textarea label="متن معرفی در بخش اصلی" value={form.heroText || ''} onChange={(e) => set('heroText', e.target.value)} className="full" />
        </div>
      </SectionCard>

      <SectionCard title="بخش درباره مدرسه">
        <div className="stack gap-12">
          <Input label="عنوان" value={form.aboutTitle || ''} onChange={(e) => set('aboutTitle', e.target.value)} />
          <Textarea label="متن" value={form.aboutText || ''} onChange={(e) => set('aboutText', e.target.value)} style={{ minHeight: 140 }} />
        </div>
      </SectionCard>

      <SectionCard title="بخش دعوت به ورود">
        <div className="stack gap-12">
          <Input label="عنوان" value={form.ctaTitle || ''} onChange={(e) => set('ctaTitle', e.target.value)} />
          <Textarea label="متن" value={form.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="اطلاعات تماس">
        <div className="form-grid">
          <Input label="شماره تلفن" value={form.contact.phone || ''} onChange={(e) => setContact('phone', e.target.value)} className="ltr" />
          <Input label="ایمیل" value={form.contact.email || ''} onChange={(e) => setContact('email', e.target.value)} className="ltr" />
          <Input label="نشانی مدرسه" value={form.contact.address || ''} onChange={(e) => setContact('address', e.target.value)} className="full" />
          <Input label="ساعات پاسخ‌گویی" value={form.contact.officeHours || ''} onChange={(e) => setContact('officeHours', e.target.value)} className="full" />
        </div>
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          اطلاعات تماس فقط از این بخش نمایش داده می‌شود؛ تا زمانی که تکمیل نشود، در سایت به‌صورت شفاف «تکمیل می‌شود» نمایش داده می‌شود.
        </div>
      </SectionCard>

      <SectionCard title="شبکه‌های اجتماعی">
        <div className="form-grid">
          <Input label="اینستاگرام" value={form.social.instagram || ''} onChange={(e) => setSocial('instagram', e.target.value)} className="ltr" />
          <Input label="تلگرام" value={form.social.telegram || ''} onChange={(e) => setSocial('telegram', e.target.value)} className="ltr" />
          <Input label="واتس‌اپ" value={form.social.whatsapp || ''} onChange={(e) => setSocial('whatsapp', e.target.value)} className="ltr" />
          <Input label="آپارات" value={form.social.aparat || ''} onChange={(e) => setSocial('aparat', e.target.value)} className="ltr" />
        </div>
      </SectionCard>

      <div>
        <Button type="submit" variant="primary" disabled={busy}>
          <Save /> {busy ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </form>
  );
}
