import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthCard } from './AuthCard';
import { Field } from './Field';
import { PasswordField } from './PasswordField';
import themeCss from './theme.css?raw';

describe('Field', () => {
  it('signin_fields_have_label_and_error: label is bound and the error is referenced by aria-describedby', () => {
    render(<Field id="email" label="Correo" error="Falta el correo" defaultValue="" />);
    const input = screen.getByLabelText('Correo');
    const error = screen.getByText('Falta el correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('has no description and is valid when there is no error', () => {
    render(<Field id="email" label="Correo" defaultValue="" />);
    const input = screen.getByLabelText('Correo');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });
});

describe('PasswordField', () => {
  it('shows and hides the password with the toggle button', () => {
    render(<PasswordField id="pw" label="Contraseña" defaultValue="" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('AuthCard', () => {
  it('renders brand, optional kicker, title, subtitle and children', () => {
    render(
      <AuthCard kicker="Interno" title="Titulo" subtitle="Subtitulo">
        <p>contenido</p>
      </AuthCard>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Titulo' })).toBeInTheDocument();
    expect(screen.getByText('Interno')).toBeInTheDocument();
    expect(screen.getByText('Subtitulo')).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByText('Multitour')).toBeInTheDocument();
  });
});

describe('theme.css', () => {
  it('accent_comes_from_the_theme_variable: accent colours are variables with the Mockup values as defaults', () => {
    // No default --accent in :root, so the submit button shows the Mockup #197d75 unless a theme sets the variable.
    expect(themeCss).not.toMatch(/:root\s*{[^}]*--accent:/);
    expect(themeCss).toMatch(/data-theme='travesia-natural'\]\s*{[^}]*--accent:\s*#146b5d/);
    expect(themeCss).toMatch(/var\(--accent-strong,\s*#184f4d\)/);
    expect(themeCss).toMatch(/\.auth-submit\s*{[^}]*var\(--accent,\s*#197d75\)/);
    expect(themeCss).toMatch(/font-family:\s*"Manrope",\s*sans-serif/);
  });
});
