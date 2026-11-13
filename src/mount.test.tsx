import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MountProps, Session } from './contract';
import { mount } from './mount';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

async function show(props: Partial<MountProps> & { access?: Session['access'] }) {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles: [], access: props.access, open: vi.fn(), close: vi.fn() };
  const apiClient = props.apiClient ?? { request: vi.fn().mockResolvedValue(undefined) };
  await act(async () => {
    unmount = mount(element, { apiClient, session, identifier: props.identifier });
  });
  return { element, session, apiClient };
}

describe('mount routes by the access mark', () => {
  it('shows the company sign-in for a normal visit and unmounts cleanly', async () => {
    const { element } = await show({ identifier: 'acme' });
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    await act(async () => unmount());
    expect(element).toBeEmptyDOMElement();
  });

  it('shows the platform sign-in when there is no identifier', async () => {
    await show({});
    expect(screen.getByRole('heading', { name: 'Acceso de plataforma' })).toBeInTheDocument();
  });

  it('temporary_credential_goes_to_first_password and password_change_session_reaches_no_other_screen', async () => {
    await show({ identifier: 'acme', access: 'password-change' });
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bienvenido de nuevo' })).not.toBeInTheDocument();
  });

  it('restricted_session_sees_only_the_notice', async () => {
    await show({ identifier: 'acme', access: 'restricted' });
    expect(screen.getByText(/La empresa está inactiva/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bienvenido de nuevo' })).not.toBeInTheDocument();
  });

  it('saved_password_goes_to_sign_in_with_notice', async () => {
    const { session } = await show({ identifier: 'acme', access: 'password-change' });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Abcdef1!x' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Abcdef1!x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    await waitFor(() => expect(session.close).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(screen.getByText('Contraseña guardada. Inicia sesión con ella.')).toBeInTheDocument();
  });

  it('unknown_access_fails_closed: only an absent mark shows the sign-in', async () => {
    await show({ identifier: 'acme', access: 'bogus' as never });
    expect(screen.getByText(/La empresa está inactiva/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bienvenido de nuevo' })).not.toBeInTheDocument();
  });

  it.each(['restricted', 'password-change'] as const)(
    'invalid_identifier_shows_not_found_before_the_%s branch',
    async (access) => {
      await show({ identifier: 'Bad/Id', access });
      expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      expect(screen.queryByText(/La empresa está inactiva/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    },
  );

  it('re_reads_the_access_after_a_good_sign_in', async () => {
    const { session } = await show({ identifier: 'acme' });
    session.open = vi.fn(() => {
      session.access = 'password-change';
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@acme.co' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Temp-pass1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
  });

  it('create_account_link_opens_the_form_and_back_returns_to_sign_in', async () => {
    await show({ identifier: 'acme' });
    fireEvent.click(screen.getByRole('link', { name: 'Crear cuenta' }));
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Inicia sesión' }));
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });
});
