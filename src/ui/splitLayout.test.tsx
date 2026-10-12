import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterScreen } from '../auth/RegisterScreen';
import { SignInScreen } from '../auth/SignInScreen';
import type { ApiClient, Session } from '../contract';
import { AuthCard } from './AuthCard';
import themeCss from './theme.css?raw';

const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
const signIn = (identifier: string | undefined, request: ApiClient['request'] = vi.fn()) =>
  render(<SignInScreen identifier={identifier} apiClient={{ request }} session={session} />);

afterEach(() => window.history.replaceState(null, '', '/'));

// Split screen of the newer Mockup (login.html, admin-login.html, crear-cuenta.html).
describe('AuthCard split layout', () => {
  it('customer: full-height photo served by the container, wordmark, phrase and the way back home', () => {
    const { container } = render(
      <AuthCard title="T" homeHref="/t/acme">
        x
      </AuthCard>,
    );
    expect(container.querySelector('aside img')).toHaveAttribute('src', '/assets/mountain-hero.jpg');
    expect(screen.getByText('Gestiona operadores, reservas y experiencias en un solo lugar.')).toBeInTheDocument();
    expect(screen.getAllByText('Multi Tour').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/t/acme');
  });

  it('customer: no back link without a home address', () => {
    render(<AuthCard title="T">x</AuthCard>);
    expect(screen.queryByRole('link', { name: 'Volver al inicio' })).not.toBeInTheDocument();
  });

  it('platform: dark panel with the internal chip and phrase, no photo', () => {
    const { container } = render(
      <AuthCard kicker="Multi tour / entorno interno" title="T">
        x
      </AuthCard>,
    );
    expect(container.querySelector('aside img')).toBeNull();
    expect(screen.getByText('Entorno interno')).toBeInTheDocument();
    expect(screen.getByText('Administra operadores y tenants de Multi Tour de forma centralizada.')).toBeInTheDocument();
    expect(container.querySelector('.auth-shell--platform')).not.toBeNull();
  });

  it('a visual title replaces the default phrase', () => {
    render(
      <AuthCard title="T" visualTitle="Otra frase">
        x
      </AuthCard>,
    );
    expect(screen.getByText('Otra frase')).toBeInTheDocument();
    expect(screen.queryByText(/Gestiona operadores/)).not.toBeInTheDocument();
  });
});

describe('SignInScreen tabs and links of the Mockup', () => {
  it('Cliente is selected by default and the operator tab changes only the copy', async () => {
    const request = vi.fn().mockResolvedValue({ accessToken: 'a', tokenType: 'Bearer', expiresIn: 900 });
    signIn('acme', request);
    expect(screen.getByRole('button', { name: 'Cliente' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Equipo del operador' }));
    expect(screen.getByRole('button', { name: 'Equipo del operador' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ingresa a tu cuenta para gestionar la operación.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@acme.co' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/tenants/acme/sessions');
  });

  it('?tab=operador preselects the operator tab', () => {
    window.history.replaceState(null, '', '/t/acme/ingresar?tab=operador');
    signIn('acme');
    expect(screen.getByRole('button', { name: 'Equipo del operador' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('links to the platform and back home, and offers no password recovery', () => {
    signIn('acme');
    expect(screen.getByRole('link', { name: /Administración de plataforma/ })).toHaveAttribute('href', '/platform');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/t/acme');
    expect(screen.queryByText(/Olvidaste/)).not.toBeInTheDocument();
  });

  it('the platform sign-in has no tabs and no company links', () => {
    signIn(undefined);
    expect(screen.queryByRole('button', { name: 'Cliente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Administración de plataforma/ })).not.toBeInTheDocument();
  });
});

describe('sign-up in the same system', () => {
  it('shows the sign-up phrase of the Mockup', () => {
    render(<RegisterScreen identifier="acme" apiClient={{ request: vi.fn() }} onDone={vi.fn()} onSignIn={vi.fn()} />);
    expect(screen.getByText('Crea tu cuenta y empieza a planear tu próxima experiencia.')).toBeInTheDocument();
  });
});

describe('theme.css layout and motion', () => {
  it('splits the screen in two columns, with the platform panel in the dark teal gradient', () => {
    expect(themeCss).toMatch(/\.auth-shell\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*0\.72fr\)\s*minmax\(380px,\s*1fr\)/);
    expect(themeCss).toMatch(/\.auth-shell--platform\s+\.auth-visual\s*{[^}]*#123c46/);
    expect(themeCss).toMatch(/\.auth-shell--platform\s+\.auth-submit\s*{[^}]*background:\s*#1f4d3d/);
    expect(themeCss).toMatch(/\.auth-visual-img\s*{[^}]*object-fit:\s*cover/);
  });

  it('enters with the fade-up and scale-in motion and respects reduced motion', () => {
    expect(themeCss).toMatch(/@keyframes mthFadeUp/);
    expect(themeCss).toMatch(/@keyframes mthScaleIn/);
    expect(themeCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[^@]*animation:\s*none/);
  });
});
