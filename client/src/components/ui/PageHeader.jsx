export function PageHeader({ eyebrow, title, lead, actions }) {
  return (
    <div className="between" style={{ alignItems: 'flex-end', marginBottom: 4 }}>
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 style={{ fontSize: 22, color: 'var(--navy-800)', marginTop: 6 }}>{title}</h1>
        {lead ? <p className="small muted" style={{ marginTop: 4 }}>{lead}</p> : null}
      </div>
      {actions ? <div className="row gap-8">{actions}</div> : null}
    </div>
  );
}
