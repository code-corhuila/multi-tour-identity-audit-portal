import { act } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './contract';
import { mount } from './mount';

// Portal spec 016, tasks PR16-01 and PR16-02: "¿Olvidaste tu contraseña?" opens the recovery inside the portal, for a company and
// for the platform (AC-PT-16.1, AC-PT-16.7).

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

async function show(identifier?: string) {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles: [], access: undefined, open: vi.fn(), close: vi.fn() };
  const apiClient = { request: vi.fn().mockResolvedValue(undefined) };
  await act(async () => {
    unmount = mount(element, { apiClient, session, identifier });
  });
  return apiClient;
}

describe('the recovery of the password inside the portal', () => {
  it('C·the_forgot_link_of_a_company_opens_the_request_screen_and_goes_back', async () => {
    await show('acme');
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(screen.getByRole('heading', { name: 'Recuperar acceso' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('C·the_platform_has_the_same_recovery: the link and the platform route', async () => {
    const apiClient = await show(undefined);
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    fireEvent.change(screen.getByLabelText('Correo electrónico registrado'), { target: { value: 'root@multitour.example' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Enviar código' })));
    expect(apiClient.request.mock.calls[0][0]).toBe('/api/v1/security/public/platform/password-recoveries');
  });

  it('C·from_the_sent_notice_to_the_reset_form_and_back_to_sign_in: the e-mail travels, the way back works', async () => {
    const apiClient = await show('acme');
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    fireEvent.change(screen.getByLabelText('Correo electrónico registrado'), { target: { value: 'ana@example.com' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Enviar código' })));
    fireEvent.click(screen.getByRole('button', { name: 'Ya tengo el código' }));
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico registrado')).toHaveValue('ana@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(apiClient.request).toHaveBeenCalledTimes(1);
  });
});
