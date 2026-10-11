import { useState } from 'react';
import { messages } from '../messages';
import { Field, type FieldProps } from './Field';

export function PasswordField(props: Omit<FieldProps, 'type' | 'adornment'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      adornment={
        <button type="button" className="auth-visibility" aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? messages.fields.hide : messages.fields.show}
        </button>
      }
    />
  );
}