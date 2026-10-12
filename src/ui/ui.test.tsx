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

describe('AuthCard width', () => {
  it('wide gives the card the sign-up width class and the default card does not have it', () => {
    const { container, rerender } = render(<AuthCard title="T">x</AuthCard>);
    expect(container.querySelector('.auth-card--wide')).toBeNull();
    rerender(<AuthCard title="T" wide>x</AuthCard>);
    expect(container.querySelector('.auth-card--wide')).not.toBeNull();
  });
});

describe('theme.css', () => {
  it('accent_comes_from_the_theme_variable: the accent is a variable whose default is the Mockup teal', () => {
    // No default --accent in :root: a tenant theme sets it, otherwise the editorial teal #147D73 applies.
    expect(themeCss).not.toMatch(/:root\s*{[^}]*--accent:/);
    expect(themeCss).toMatch(/data-theme='travesia-natural'\]\s*{[^}]*--accent:\s*#146b5d/);
    expect(themeCss).toMatch(/\.auth-link\s*{[^}]*var\(--accent,\s*#147D73\)/);
    expect(themeCss).toMatch(/\.auth-feedback\.is-success\s*{[^}]*var\(--accent,\s*#147D73\)/);
  });

  it('carries the editorial tokens of the Mockup login (feat/operator-landing-sync)', () => {
    expect(themeCss).toMatch(/--mt-ink:\s*#102A32/);
    expect(themeCss).toMatch(/--mt-coral:\s*#E9785D/);
    expect(themeCss).toMatch(/--mt-line:\s*#E5E0D8/);
    expect(themeCss).toMatch(/--mt-error:\s*#9E3B2B/);
    expect(themeCss).toMatch(/\.auth-submit\s*{[^}]*background:\s*var\(--mt-coral\)/);
    expect(themeCss).toMatch(/\.auth-copy h1\s*{[^}]*"Fraunces",\s*serif/);
    expect(themeCss).toMatch(/\.auth-input-wrap input\s*{[^}]*min-height:\s*48px[^}]*border-radius:\s*6px/);
    expect(themeCss).toMatch(/font-family:\s*"Manrope",\s*sans-serif/);
  });
});
