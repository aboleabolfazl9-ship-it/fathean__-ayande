export function StatCard({ label, value, foot, icon: Icon }) {
  return (
    <div className="stat">
      <span className="label">
        {Icon ? <Icon size={15} /> : null}
        {label}
      </span>
      <strong className="num">{value}</strong>
      {foot ? <span className="foot">{foot}</span> : null}
    </div>
  );
}

export function SectionCard({ title, action, children }) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
