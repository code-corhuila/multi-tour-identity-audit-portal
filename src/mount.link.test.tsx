import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './contract';
import { mount } from './mount';

const TOKEN = 'L'.repeat(43);
let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

async function show(address: string, request = vi.fn().mockResolvedValue(undefined)) {
  window.history.replaceState(null, '', address);
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier: 'acme', commercialName: 'Acme Tours' });
  });
  return { request, session };
}

describe('the page behind the link of the e-mail', () => {
  it('the_link_is_read_and_removed_from_the_address: opens the page, takes the link out of the address and sends it with the password', async () => {
    const { request, session } = await show(`/t/acme/verificar-correo#token=${TOKEN}`);
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar correo' }));
    expect(await screen.findByText('Tu correo quedó verificado y tu cuenta está activa.')).toBeInTheDocument();
    expect(request.mock.calls[0][1].body).toEqual({ token: TOKEN, password: 'Viaje-2026!' });
    // The page opens no session by itself (RN-SEC-PT-36).
    expect(session.open).not.toHaveBeenCalled();
  });

  it('confirmed_link_shows_verified_and_the_way_to_sign_in: "Iniciar sesión" leads to the sign-in', async () => {
    await show(`/t/acme/verificar-correo#token=${TOKEN}`);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar correo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument());
  });

  it('a_page_without_a_link_offers_a_new_one: the path without the fragment shows the bad-link screen, which opens the new-link form', async () => {
    await show('/t/acme/verificar-correo');
    expect(screen.getByText(/Este enlace ya no funciona/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir un nuevo enlace' }));
    expect(await screen.findByRole('heading', { name: 'Pedir un nuevo enlace' })).toBeInTheDocument();
  });

  it('any other path of the company keeps showing the sign-in', async () => {
    await show('/t/acme/ingresar');
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('the page of another company path is not taken for the link page', async () => {
    await show(`/platform/verificar-correo#token=${TOKEN}`);
    expect(screen.queryByRole('heading', { name: 'Verifica tu correo' })).not.toBeInTheDocument();
  });
});
