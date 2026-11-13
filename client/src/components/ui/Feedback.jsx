import { AlertCircle, CheckCircle2, Info, Loader2, Inbox } from 'lucide-react';

export function Spinner({ label = 'در حال بارگذاری…' }) {
  return (
    <div className="loading-screen">
      <Loader2 className="spinner" size={30} />
      <span className="small">{label}</span>
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'info' ? Info : AlertCircle;
  return (
    <div className={`alert alert-${kind === 'info' ? 'info' : kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="row gap-8">
        <Icon size={15} style={{ flexShrink: 0 }} />
        <span>{children}</span>
      </span>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox, action = null }) {
  return (
    <div className="empty-state">
      <Icon size={40} />
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

export function Pill({ tone = 'gray', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
