import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Scope, Session } from '../contract';
import { SignInScreen } from './SignInScreen';
import { mount } from '../mount';
import { act } from 'react';

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

function setup(identifier: string | undefined, request: ApiClient['request'] = vi.fn().mockResolvedValue(answer), scope?: Scope) {
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  render(<SignInScreen identifier={identifier} scope={scope} apiClient={{ request }} session={session} />);
  return session;
}

const fill = () => {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@acme.co' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
};

// Spec 006 PT-02: the sign-in view of the Mockup (login.html) at the link of a company, with no company field.
describe('calque of the Mockup: the sign-in view (RN-CAL-IDN-02, -03, -05)', () => {
  it('login_renders_its_mockup_parts', () => {
    setup('acme');
    expect(screen.getAllByText('Multi Tour').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equipo del operador' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/t/acme/recuperar');
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Administración de plataforma' })).toBeInTheDocument();
    expect(screen.getByText('¿No tienes una cuenta?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('tabs_change_text_but_not_fields_or_request', () => {
    setup('acme');
    const before = screen.getAllByRole('textbox').length + document.querySelectorAll('input').length;
    expect(screen.queryByText(/Solicítalo a un administrador/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Equipo del operador' }));
    expect(screen.getByText('Ingresa a tu cuenta para gestionar la operación.')).toBeInTheDocument();
    expect(screen.getByText(/Solicítalo a un administrador/)).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length + document.querySelectorAll('input').length).toBe(before);
  });

  it('request_is_the_same_for_both_tabs', async () => {
    const request = vi.fn().mockResolvedValue(answer);
    setup('acme', request);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Equipo del operador' }));
    // The password is cleared once the sign-in went through.
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  });

  it('platform_link_and_back_link_go_to_the_right_route', () => {
    setup('acme');
    expect(screen.getByRole('link', { name: 'Administración de plataforma' })).toHaveAttribute('href', '/platform');
    document.body.innerHTML = '';
    setup(undefined);
    // No company is known on the platform screen, so the way back is the container's welcome.
    expect(screen.getByRole('link', { name: 'Volver al acceso general' })).toHaveAttribute('href', '/');
  });

  it('login_has_its_states', async () => {
    let reject: (e: unknown) => void = () => {};
    const request = vi.fn(() => new Promise((_, r) => { reject = r; })) as unknown as ApiClient['request'];
    setup('acme', request);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    await act(async () => reject(Object.assign(new Error('x'), { status: 401 })));
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });
});

describe('calque of the Mockup: no company field (RN-CAL-IDN-01)', () => {
  it('platform_root_has_no_company_sign_in: the general scope shows a notice to use the company link, with no form', async () => {
    const element = document.body.appendChild(document.createElement('div'));
    const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
    let unmount = () => {};
    await act(async () => {
      unmount = mount(element, { apiClient: { request: vi.fn() }, session, scope: 'general' });
    });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(within(element).getByRole('heading', { name: 'Elige tu empresa' })).toBeInTheDocument();
    expect(within(element).getAllByRole('link', { name: 'Volver al inicio' })[0]).toHaveAttribute('href', '/');
    await act(async () => unmount());
  });
});
