import { useEffect, useState } from 'react';
import { KeyRound, Power } from 'lucide-react';
import { api, patch, post } from '../../api';
import { faDateTime, faNum, roleLabel } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

export default function AdminUsers() {
  const [rows, setRows] = useState(null);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ error: '', success: '' });
  const [invite, setInvite] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search.trim()) params.set('search', search.trim());
    api(`/admin/users?${params.toString()}`).then(setRows).catch(() => setRows([]));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  const toggle = async (user) => {
    try {
      await patch(`/admin/users/${user.id}`, { isActive: !user.is_active });
      setState({ error: '', success: user.is_active ? 'حساب غیرفعال شد.' : 'حساب فعال شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  const issue = async (user) => {
    try {
      const result = await post(`/admin/users/${user.id}/invite`);
      setInvite({ ...result, username: user.username, name: user.full_name });
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
        title={`کاربران سامانه ${rows ? `(${faNum(rows.length)})` : ''}`}
        action={
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی نام یا نام کاربری" style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="جست‌وجوی کاربر" />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر نقش">
              <option value="">همه نقش‌ها</option>
              <option value="admin">مدیر</option>
              <option value="teacher">معلم</option>
              <option value="student">دانش‌آموز</option>
            </select>
          </div>
        }
      >
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="کاربری یافت نشد" />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'نام', render: (row) => (
                <div>
                  <strong style={{ fontSize: 13 }}>{row.full_name}</strong>
                  <div className="tiny muted ltr">{row.username}</div>
                </div>
              ) },
              { key: 'role', header: 'نقش', render: (row) => <Pill tone="gray">{roleLabel(row.role)}</Pill> },
              { key: 'status', header: 'وضعیت', render: (row) => (
                <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                  {row.is_active ? <Pill tone="green">فعال</Pill> : <Pill tone="red">غیرفعال</Pill>}
                  {row.pending_activation ? <Pill tone="amber">در انتظار فعال‌سازی</Pill> : null}
                </div>
              ) },
              { key: 'login', header: 'آخرین ورود', render: (row) => <span className="tiny">{row.last_login_at ? faDateTime(row.last_login_at) : '—'}</span> },
              { key: 'actions', header: '', render: (row) => (
                <div className="row gap-4">
                  <Button variant="ghost" size="sm" onClick={() => issue(row)}><KeyRound /> کد دعوت</Button>
                  {row.id !== undefined ? (
                    <Button variant="ghost" size="sm" onClick={() => toggle(row)}><Power /> {row.is_active ? 'غیرفعال' : 'فعال'}</Button>
                  ) : null}
                </div>
              ) },
            ]}
            rows={rows}
          />
        )}
      </SectionCard>

      <Modal open={Boolean(invite)} title="کد دعوت کاربر" onClose={() => setInvite(null)}>
        <Alert kind="warn">کد فقط یک بار نمایش داده می‌شود و تا ۷ روز معتبر است.</Alert>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div className="tiny muted">نام کاربری</div>
          <div className="ltr" style={{ fontWeight: 700, marginBottom: 10 }}>{invite?.username}</div>
          <div className="tiny muted">کد دعوت</div>
          <div className="ltr" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.18em', color: 'var(--navy-800)' }}>{invite?.code}</div>
          <div className="tiny muted" style={{ marginTop: 10 }}>{invite?.name}</div>
        </div>
      </Modal>
    </>
  );
}
