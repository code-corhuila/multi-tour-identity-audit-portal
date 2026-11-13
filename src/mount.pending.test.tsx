import { act } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './contract';
import { mount } from './mount';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('from the pending sign-in to the new-link form', () => {
  it('pending_sign_in_says_to_verify_and_offers_a_link: the e-mail typed at the sign-in is already in the form', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 403, details: [{ field: 'email', message: 'EMAIL_NOT_VERIFIED' }] }))
      .mockResolvedValue(undefined);
    const element = document.body.appendChild(document.createElement('div'));
    const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
    await act(async () => {
      unmount = mount(element, { apiClient: { request }, session, identifier: 'acme', commercialName: 'Acme Tours' });
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@mail.co' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pedir un nuevo enlace' }));
    expect(await screen.findByRole('heading', { name: 'Pedir un nuevo enlace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ana@mail.co');
    // The e-mail is only in the form: nothing is stored.
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
