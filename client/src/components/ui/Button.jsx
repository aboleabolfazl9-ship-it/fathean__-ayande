import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'btn btn-primary',
  gold: 'btn btn-gold',
  outline: 'btn btn-outline',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
};

export function Button({ variant = 'primary', size, to, href, children, className = '', ...rest }) {
  const cls = `${VARIANTS[variant] || VARIANTS.primary} ${size === 'sm' ? 'btn-sm' : ''} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({ label, onClick, children, className = '' }) {
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}
