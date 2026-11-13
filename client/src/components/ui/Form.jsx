export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label ? <label>{label}</label> : null}
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Input({ label, hint, className, ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, className, ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea {...rest} />
    </Field>
  );
}

export function Select({ label, hint, options, className, placeholder, ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({ label, ...rest }) {
  return (
    <label className="check-row">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
