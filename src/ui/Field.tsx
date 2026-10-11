import type { InputHTMLAttributes, ReactNode } from 'react';
import './theme.css';

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  adornment?: ReactNode;
};

// One label per field; its error sits beside it and is referenced by aria-describedby (Annex H).
export function Field({ id, label, error, adornment, 'aria-describedby': extra, ...input }: FieldProps) {
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : undefined, extra].filter(Boolean).join(' ') || undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
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
