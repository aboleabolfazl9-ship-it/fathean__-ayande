import { useEffect, useState } from 'react';
import { KeyRound, Pencil, UserPlus } from 'lucide-react';
import { api, patch, post } from '../../api';
import { faNum, PERMISSION_LABELS } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups, invalidateLookups } from './lookups';

const EMPTY_PERMS = { can_grade: true, can_exams: false, can_jenm: false, can_announce: false, can_view_reports: false };

export default function AdminTeachers() {
  const lookups = useLookups();
  const [rows, setRows] = useState(null);
  const [state, setState] = useState({ error: '', success: '' });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ fullName: '', username: '', field: '', email: '', phone: '', classIds: [] });
  const [editForm, setEditForm] = useState({ fullName: '', field: '', phone: '', classIds: [], permissions: EMPTY_PERMS, isActive: true });

  const load = () => api('/admin/teachers').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const createTeacher = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      const result = await post('/admin/teachers', {
        ...newTeacher,
        classIds: newTeacher.classIds.map(Number),
      });
      setCreating(false);
      setInvite({ ...result.invite, name: newTeacher.fullName, username: result.username });
      setNewTeacher({ fullName: '', username: '', field: '', email: '', phone: '', classIds: [] });
      invalidateLookups();
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (teacher) => {
    setEditing(teacher);
    setEditForm({
      fullName: teacher.full_name,
      field: teacher.field || '',
      phone: teacher.phone || '',
      classIds: (teacher.classes || []).map((c) => c.id),
      permissions: { ...EMPTY_PERMS, ...(teacher.permissions || {}) },
      isActive: teacher.user_active,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      await patch(`/admin/teachers/${editing.id}`, {
        ...editForm,
        classIds: editForm.classIds.map(Number),
      });
      setEditing(null);
      setState({ error: '', success: 'اطلاعات معلم ذخیره شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  const issueInvite = async (teacher) => {
    try {
      const result = await post(`/admin/teachers/${teacher.id}/invite`);
      setInvite({ ...result, name: teacher.full_name, username: teacher.username });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const toggleClass = (id) => {
    setNewTeacher((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(id) ? prev.classIds.filter((x) => x !== id) : [...prev.classIds, id],
    }));
  };

  const toggleEditClass = (id) => {
    setEditForm((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(id) ? prev.classIds.filter((x) => x !== id) : [...prev.classIds, id],
    }));
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>

      <SectionCard
        title={`معلمان ${rows ? `(${faNum(rows.length)})` : ''}`}
        action={
          <Button variant="primary" size="sm" onClick={() => { setCreating(true); setState({ error: '', success: '' }); }}>
            <UserPlus /> حساب معلم جدید
          </Button>
        }
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="حساب معلمی ثبت نشده است" description="حساب معلمان فقط با اطلاعات ارائه‌شده توسط مدیر ساخته می‌شود." />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'نام معلم', render: (row) => (
                <div>
                  <strong style={{ fontSize: 13 }}>{row.full_name}</strong>
                  <div className="tiny muted ltr">{row.username}</div>
                </div>
              ) },
              { key: 'field', header: 'درس', render: (row) => row.field || '—' },
              { key: 'classes', header: 'کلاس‌ها', render: (row) => (
                (row.classes || []).length ? (row.classes.map((c) => c.name).join('، ')) : <span className="muted">بدون کلاس</span>
              ) },
              { key: 'permissions', header: 'مجوزها', render: (row) => (
                <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                  {Object.entries(row.permissions || {}).filter(([, v]) => v).map(([k]) => (
                    <Pill key={k} tone="blue">{PERMISSION_LABELS[k] || k}</Pill>
                  ))}
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

      <Modal open={creating} title="ایجاد حساب معلم" onClose={() => setCreating(false)}>
        <form onSubmit={createTeacher} className="stack gap-12">
          <Input label="نام و نام خانوادگی" value={newTeacher.fullName} onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })} required />
          <Input label="نام کاربری (انگلیسی)" value={newTeacher.username} onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })} className="ltr" required hint="۳ تا ۳۲ نویسه؛ حروف انگلیسی، عدد، نقطه، خط تیره." />
          <div className="form-grid">
            <Input label="درس تخصصی" value={newTeacher.field} onChange={(e) => setNewTeacher({ ...newTeacher, field: e.target.value })} />
            <Input label="شماره تماس" value={newTeacher.phone} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} className="ltr" />
            <Input label="ایمیل" type="email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} className="ltr full" />
          </div>
          <div>
            <div className="small" style={{ fontWeight: 700, color: 'var(--navy-800)', marginBottom: 8 }}>کلاس‌های مجاز</div>
            <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
              {lookups.classes.map((cls) => (
                <Checkbox key={cls.id} label={cls.name} checked={newTeacher.classIds.includes(cls.id)} onChange={() => toggleClass(cls.id)} />
              ))}
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>ایجاد حساب</Button>
        </form>
      </Modal>

      <Modal open={Boolean(editing)} title="ویرایش معلم و سطح دسترسی" onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={saveEdit} className="stack gap-12">
            <Input label="نام و نام خانوادگی" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            <div className="form-grid">
              <Input label="درس تخصصی" value={editForm.field} onChange={(e) => setEditForm({ ...editForm, field: e.target.value })} />
              <Input label="شماره تماس" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="ltr" />
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, color: 'var(--navy-800)', marginBottom: 8 }}>کلاس‌های مجاز</div>
              <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
                {lookups.classes.map((cls) => (
                  <Checkbox key={cls.id} label={cls.name} checked={editForm.classIds.includes(cls.id)} onChange={() => toggleEditClass(cls.id)} />
                ))}
              </div>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, color: 'var(--navy-800)', marginBottom: 8 }}>مجوزهای عملیاتی</div>
              <div className="stack gap-8">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <Checkbox
                    key={key}
                    label={label}
                    checked={Boolean(editForm.permissions[key])}
                    onChange={(e) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, [key]: e.target.checked } })}
                  />
                ))}
              </div>
            </div>
            <Checkbox label="حساب فعال است" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
            <Button type="submit" variant="primary" disabled={busy}>ذخیره تغییرات</Button>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(invite)} title="کد دعوت معلم" onClose={() => setInvite(null)}>
        <Alert kind="warn">این کد فقط یک بار نمایش داده می‌شود.</Alert>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div className="tiny muted">نام کاربری</div>
          <div className="ltr" style={{ fontWeight: 700, marginBottom: 10 }}>{invite?.username}</div>
          <div className="tiny muted">کد دعوت</div>
          <div className="ltr" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.18em', color: 'var(--navy-800)' }}>{invite?.code}</div>
          <div className="tiny muted" style={{ marginTop: 10 }}>برای {invite?.name}</div>
        </div>
      </Modal>
    </>
  );
}
