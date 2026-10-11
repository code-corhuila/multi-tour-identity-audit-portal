import type { InputHTMLAttributes, ReactNode } from 'react';
import './theme.css';

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  adornment?: ReactNode;
};

// One label per field; its error sits beside it and is referenced by aria-describedby (Annex H).
export function Field({ id, label, error, adornment, ...input }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...input}
        />
        {adornment}
      </div>
      {error && (
        <p id={errorId} className="auth-field-error">
          {error}
        </p>
      )}
    </div>
  );
}