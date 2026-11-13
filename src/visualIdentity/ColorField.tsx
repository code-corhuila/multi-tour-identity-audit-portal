import { HEX_COLOR } from './visualIdentityApi';
import { visualIdentityMessages as text } from './messages';

export interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

// What the native picker shows while the text is not a valid color yet: a picker cannot be empty.
const PICKER_PLACEHOLDER = '#000000';

// A native picker and the `#RRGGBB` text, kept in step. The text is the source (a typed value may be invalid, the
// picker's never is); the picker shows the last valid color while the text is half typed.
export function ColorField({ id, label, value, error, onChange }: ColorFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="visual-identity-inputs">
        <input
          type="color"
          aria-label={text.pickerOf(label)}
          value={HEX_COLOR.test(value) ? value.toLowerCase() : PICKER_PLACEHOLDER}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="auth-input-wrap">
          <input
            id={id}
            type="text"
            value={value}
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} className="auth-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
