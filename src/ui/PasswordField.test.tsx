import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PasswordField } from './PasswordField';

it('password_toggle_sets_aria_pressed', () => {
  render(<PasswordField id="pw" label="Contraseña" defaultValue="" />);
  const toggle = screen.getByRole('button', { name: 'Ver' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true');
});
