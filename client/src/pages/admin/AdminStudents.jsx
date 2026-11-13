import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Search, UserPlus } from 'lucide-react';
import { api, patch, post } from '../../api';
import { faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups, invalidateLookups } from './lookups';

export default function AdminStudents() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [state, setState] = useState({ error: '', success: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({});
  const [newStudent, setNewStudent] = useState({ fullName: '', classId: '', campId: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (classId) params.set('classId', classId);
    api(`/admin/students?${params.toString()}`).then(setRows).catch((err) => setState({ error: err.message, success: '' }));
  }, [search, classId]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openEdit = (student) => {
    setState({ error: '', success: '' });
    setEditing(student);
    setForm({
      fullName: student.full_name,
      classId: student.class_id || '',
      campId: student.camp_id || '',
      guardianName: student.guardian_name || '',
      guardianPhone: student.guardian_phone || '',
      phone: student.phone || '',
      isActive: student.is_active,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      await patch(`/admin/students/${editing.id}`, {
        ...form,
        classId: form.classId ? Number(form.classId) : null,
        campId: form.campId ? Number(form.campId) : null,
      });
      setEditing(null);
      setState({ error: '', success: 'اطلاعات دانش‌آموز ذخیره شد.' });
      invalidateLookups();
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  const createStudent = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      const result = await post('/admin/students', {
        fullName: newStudent.fullName,
        classId: Number(newStudent.classId),
        campId: newStudent.campId ? Number(newStudent.campId) : null,
      });
      setCreating(false);
      setNewStudent({ fullName: '', classId: '', campId: '' });
      setInvite({ ...result.invite, name: newStudent.fullName, username: result.username });
      invalidateLookups();
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  const issueInvite = async (student) => {
    setState({ error: '', success: '' });
    try {
      const result = await post(`/admin/students/${student.id}/invite`);
      setInvite({ ...result, name: student.full_name, username: student.username });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>

      <SectionCard
        title={`دانش‌آموزان ${rows ? `(${faNum(rows.length)})` : ''}`}
        action={
          <div className="toolbar">
            <div className="row gap-4" style={{ border: '1px solid var(--line)', borderRadius: 9, padding: '0 8px', background: '#fff' }}>
              <Search size={15} style={{ color: 'var(--muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جست‌وجوی نام یا کد"
                style={{ border: 'none', padding: '8px 4px', outline: 'none', width: 150 }}
                aria-label="جست‌وجوی دانش‌آموز"
              />
            </div>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر کلاس">
              <option value="">همه کلاس‌ها</option>
              {lookups.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={() => { setCreating(true); setState({ error: '', success: '' }); }}>
              <UserPlus /> دانش‌آموز جدید
            </Button>
          </div>
        }
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="دانش‌آموزی یافت نشد" description="با تغییر فیلترها یا جست‌وجو دوباره تلاش کنید." />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'نام دانش‌آموز', render: (row) => (
                <div>
                  <strong style={{ fontSize: 13 }}>{row.full_name}</strong>
                  <div className="tiny muted ltr">{row.student_code} · {row.username}</div>
                </div>
              ) },
              { key: 'class', header: 'کلاس', render: (row) => row.class_name || '—' },
              { key: 'camp', header: 'قرارگاه', render: (row) => row.camp_name || <span className="muted">تعیین نشده</span> },
              { key: 'jenm', header: 'جنم', render: (row) => <b className="num">{faNum(row.jenm_total)}</b> },
              { key: 'status', header: 'وضعیت', render: (row) => (
                <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                  {row.is_active ? <Pill tone="green">فعال</Pill> : <Pill tone="red">غیرفعال</Pill>}
                  {row.pending_activation ? <Pill tone="amber">در انتظار فعال‌سازی</Pill> : null}
                </div>
              ) },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil /> ویرایش</Button>
                  <Button variant="ghost" size="sm" onClick={() => issueInvite(row)}><KeyRound /> کد دعوت</Button>
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={Boolean(editing)} title="ویرایش دانش‌آموز" onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={saveEdit} className="stack gap-12">
            <Input label="نام و نام خانوادگی" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <div className="form-grid">
              <Select
                label="کلاس"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                placeholder="بدون کلاس"
                options={lookups.classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              />
              <Select
                label="قرارگاه"
                value={form.campId}
                onChange={(e) => setForm({ ...form, campId: e.target.value })}
                placeholder="بدون قرارگاه"
                options={lookups.camps.map((camp) => ({ value: camp.id, label: camp.name || `قرارگاه ${camp.slot}` }))}
              />
              <Input label="شماره تماس دانش‌آموز" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ltr" />
              <Input label="نام سرپرست" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              <Input label="شماره سرپرست" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className="ltr" />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              حساب دانش‌آموز فعال است
            </label>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</Button>
          </form>
        ) : null}
      </Modal>

      <Modal open={creating} title="افزودن دانش‌آموز" onClose={() => setCreating(false)}>
        <form onSubmit={createStudent} className="stack gap-12">
          <p className="small muted">
            با ایجاد دانش‌آموز، یک حساب کاربری مستقل ساخته می‌شود. رمز عبور به‌صورت کد دعوت یک‌بارمصرف صادر می‌شود و
            دانش‌آموز خودش رمز شخصی تعیین می‌کند.
          </p>
          <Input label="نام و نام خانوادگی" value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} required />
          <Select
            label="کلاس"
            value={newStudent.classId}
            onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
            placeholder="انتخاب کلاس"
            options={lookups.classes.map((cls) => ({ value: cls.id, label: cls.name }))}
            required
          />
          <Select
            label="قرارگاه (اختیاری)"
            value={newStudent.campId}
            onChange={(e) => setNewStudent({ ...newStudent, campId: e.target.value })}
            placeholder="بدون قرارگاه"
            options={lookups.camps.map((camp) => ({ value: camp.id, label: camp.name || `قرارگاه ${camp.slot}` }))}
          />
          <Button type="submit" variant="primary" disabled={busy}><Plus /> ایجاد حساب دانش‌آموز</Button>
        </form>
      </Modal>

      <Modal open={Boolean(invite)} title="کد دعوت حساب" onClose={() => setInvite(null)}>
        <Alert kind="warn">این کد فقط یک بار نمایش داده می‌شود و تا ۷ روز اعتبار دارد.</Alert>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div className="tiny muted">نام کاربری</div>
          <div className="ltr" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{invite?.username}</div>
          <div className="tiny muted">کد دعوت</div>
          <div className="ltr" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.18em', color: 'var(--navy-800)' }}>
            {invite?.code}
          </div>
          <div className="tiny muted" style={{ marginTop: 10 }}>
            برای {invite?.name} — اعتبار {faNum(invite?.expiresInDays || 7)} روز
          </div>
        </div>
        <p className="small muted">
          دانش‌آموز با مراجعه به صفحه «فعال‌سازی حساب»، نام کاربری و این کد را وارد و رمز عبور شخصی خود را تعیین می‌کند.
        </p>
      </Modal>
    </>
  );
}
