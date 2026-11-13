import { useCallback, useEffect, useState } from 'react';
import { MinusCircle, PlusCircle, RotateCcw, Search } from 'lucide-react';
import { api, post } from '../../api';
import { faDateTime, faNum } from '../../utils';
import { Spinner, Alert, EmptyState, Pill } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { SectionCard } from '../../components/ui/Stat';
import { DataTable } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useLookups } from './lookups';

export default function AdminJenm() {
  const lookups = useLookups();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ studentId: '', classId: '', campId: '', kind: '', from: '', to: '' });
  const [form, setForm] = useState({ studentId: '', kind: 'add', amount: '', reason: '' });
  const [state, setState] = useState({ error: '', success: '' });
  const [busy, setBusy] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [reverseReason, setReverseReason] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    api(`/admin/jenm?${params.toString()}`)
      .then(setData)
      .catch((err) => setState({ error: err.message, success: '' }));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setState({ error: '', success: '' });
    try {
      await post('/admin/jenm', {
        studentId: Number(form.studentId),
        kind: form.kind,
        amount: Number(form.amount),
        reason: form.reason,
      });
      setForm({ studentId: '', kind: 'add', amount: '', reason: '' });
      setState({ error: '', success: 'امتیاز جنم ثبت شد.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    } finally {
      setBusy(false);
    }
  };

  const reverse = async () => {
    try {
      await post(`/admin/jenm/${reversing.id}/reverse`, { reason: reverseReason });
      setReversing(null);
      setReverseReason('');
      setState({ error: '', success: 'تراکنش اصلاح شد و رکورد اصلاحی در تاریخچه ثبت گردید.' });
      load();
    } catch (err) {
      setState({ error: err.message, success: '' });
    }
  };

  return (
    <>
      <Alert kind="error">{state.error}</Alert>
      <Alert kind="success">{state.success}</Alert>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <SectionCard title="ثبت امتیاز جنم">
          <form onSubmit={submit} className="stack gap-12">
            <Select
              label="دانش‌آموز"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              placeholder="انتخاب دانش‌آموز"
              options={lookups.students.map((s) => ({ value: s.id, label: `${s.full_name} — ${s.class_name || 'بدون کلاس'}` }))}
              required
            />
            <div className="form-grid">
              <Select
                label="نوع تراکنش"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                options={[{ value: 'add', label: 'افزودن امتیاز' }, { value: 'subtract', label: 'کاهش امتیاز' }]}
              />
              <Input label="مقدار" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <Textarea label="دلیل تغییر" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required hint="دلیل برای همه کاربران در تاریخچه امتیاز ثبت می‌شود." />
            <Button type="submit" variant="primary" disabled={busy}>
              {form.kind === 'add' ? <PlusCircle /> : <MinusCircle />}
              {busy ? 'در حال ثبت…' : 'ثبت تراکنش'}
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="جمع امتیاز کلاس‌ها و قرارگاه‌ها">
          {data === null ? (
            <Spinner />
          ) : (
            <>
              <div className="row gap-4" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
                {data.classTotals.map((cls) => (
                  <Pill key={cls.id} tone="blue">{cls.code}: {faNum(cls.total)}</Pill>
                ))}
              </div>
              <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                {data.campTotals.map((camp) => (
                  <Pill key={camp.id} tone="gold">{camp.name || `قرارگاه ${faNum(camp.slot)}`}: {faNum(camp.total)}</Pill>
                ))}
              </div>
              <div className="divider" style={{ margin: '16px 0' }} />
              <div className="small muted">مجموع امتیاز کل مدرسه</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy-800)' }} className="num">
                {faNum(data.classTotals.reduce((sum, cls) => sum + cls.total, 0))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="تاریخچه تراکنش‌های جنم"
        action={
          <div className="toolbar">
            <select value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر کلاس">
              <option value="">همه کلاس‌ها</option>
              {lookups.classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
            <select value={filters.campId} onChange={(e) => setFilters({ ...filters, campId: e.target.value })} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر قرارگاه">
              <option value="">همه قرارگاه‌ها</option>
              {lookups.camps.map((camp) => <option key={camp.id} value={camp.id}>{camp.name || `قرارگاه ${camp.slot}`}</option>)}
            </select>
            <select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)' }} aria-label="فیلتر نوع">
              <option value="">همه انواع</option>
              <option value="add">افزودن</option>
              <option value="subtract">کاهش</option>
            </select>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="از تاریخ" style={{ padding: '6px 9px', borderRadius: 9, border: '1px solid var(--line)' }} />
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="تا تاریخ" style={{ padding: '6px 9px', borderRadius: 9, border: '1px solid var(--line)' }} />
          </div>
        }
      >
        {data === null ? (
          <Spinner />
        ) : data.transactions.length === 0 ? (
          <EmptyState title="تراکنشی ثبت نشده است" description="امتیاز اولیه همه دانش‌آموزان صفر است؛ نخستین تغییر را از فرم بالا ثبت کنید." />
        ) : (
          <DataTable
            columns={[
              { key: 'student', header: 'دانش‌آموز', render: (row) => (
                <div>
                  <strong style={{ fontSize: 13 }}>{row.full_name}</strong>
                  <div className="tiny muted">{row.class_name || '—'}</div>
                </div>
              ) },
              { key: 'amount', header: 'امتیاز', render: (row) => (
                <span className={`amount num ${row.amount >= 0 ? 'plus' : 'minus'}`}>
                  {row.amount >= 0 ? '+' : '−'}{faNum(Math.abs(row.amount))}
                </span>
              ) },
              { key: 'reason', header: 'دلیل', render: (row) => <span className="small">{row.reason}</span> },
              { key: 'by', header: 'ثبت‌کننده', render: (row) => <span className="tiny">{row.created_by_name} ({row.created_by_role === 'admin' ? 'مدیر' : 'معلم'})</span> },
              { key: 'date', header: 'تاریخ', render: (row) => <span className="tiny">{faDateTime(row.created_at)}</span> },
              { key: 'actions', header: '', render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => { setReversing(row); setReverseReason(''); }}><RotateCcw /> اصلاح</Button>
              ) },
            ]}
            rows={data.transactions}
          />
        )}
      </SectionCard>

      <Modal open={Boolean(reversing)} title="اصلاح تراکنش جنم" onClose={() => setReversing(null)}>
        <p className="small muted">
          تراکنش حذف نمی‌شود؛ یک تراکنش معکوس با دلیل ثبت می‌شود تا تاریخچه کامل باقی بماند.
        </p>
        <div className="card card-pad">
          <strong style={{ fontSize: 13 }}>{reversing?.full_name}</strong>
          <div className="small muted">{reversing?.reason}</div>
          <div className={`amount num ${reversing?.amount >= 0 ? 'plus' : 'minus'}`}>{faNum(reversing?.amount)}</div>
        </div>
        <Textarea label="دلیل اصلاح" value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} required />
        <Button variant="danger" onClick={reverse} disabled={reverseReason.trim().length < 3}>
          ثبت تراکنش اصلاحی
        </Button>
      </Modal>
    </>
  );
}
