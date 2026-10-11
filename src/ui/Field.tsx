import type { InputHTMLAttributes, ReactNode } from 'react';

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  adornment?: ReactNode;
};

export function Field(_props: FieldProps) {
  return null;
}
