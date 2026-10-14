import './theme.css';

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}

export function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, name]) => (
            <option key={v} value={v}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
