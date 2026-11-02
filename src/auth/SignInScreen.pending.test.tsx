import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { SignInScreen } from './SignInScreen';

const PENDING = 'Tu cuenta aún está inactiva: verifica tu correo con el enlace que te enviamos.';
const REFUSED = 'Correo o contraseña incorrectos';
const NEW_LINK = 'Pedir un nuevo enlace';
const pending = () => Object.assign(new Error('x'), { status: 403, details: [{ field: 'email', message: 'EMAIL_NOT_VERIFIED' }] });

function setup(request: ApiClient['request']) {
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  const onRequestLink = vi.fn();
  render(<SignInScreen identifier="acme" apiClient={{ request }} session={session} onRequestLink={onRequestLink} />);
  return { session, onRequestLink };
}

function signIn(email = ' ana@mail.co ', password = 'Viaje-2026!') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe('sign-in of an account that is still pending', () => {
  it('pending_sign_in_says_to_verify_and_offers_a_link: opens no session and hands the typed e-mail to the new-link form', async () => {
    const { session, onRequestLink } = setup(vi.fn().mockRejectedValue(pending()));
    signIn();
    expect(await screen.findByText(PENDING)).toBeInTheDocument();
    expect(screen.queryByText(REFUSED)).not.toBeInTheDocument();
    expect(session.open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: NEW_LINK }));
    expect(onRequestLink).toHaveBeenCalledWith('ana@mail.co');
  });

  it('the message and the action go away on the next attempt', async () => {
    const request = vi.fn().mockRejectedValueOnce(pending()).mockRejectedValueOnce(Object.assign(new Error('x'), { status: 401 }));
    setup(request);
    signIn();
    await screen.findByText(PENDING);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.queryByText(PENDING)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NEW_LINK })).not.toBeInTheDocument();
  });

  it('wrong_password_keeps_the_generic_message: a 401 tells nothing about the account', async () => {
    setup(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 401 })));
    signIn();
    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.queryByText(PENDING)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NEW_LINK })).not.toBeInTheDocument();
  });

  it.each([
    ['a 403 without the code', { status: 403 }],
    ['a 403 with another code', { status: 403, details: [{ field: 'email', message: 'OTHER' }] }],
    ['the code in the message of a 401', { status: 401, details: [{ field: 'email', message: 'EMAIL_NOT_VERIFIED' }] }],
    ['the code only in the message of the answer', { status: 403, message: 'EMAIL_NOT_VERIFIED' }],
  ])('the status and the code decide, so %s is not the pending screen', async (_name, extra) => {
    setup(vi.fn().mockRejectedValue(Object.assign(new Error('x'), extra)));
    signIn();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled());
    expect(screen.queryByText(PENDING)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NEW_LINK })).not.toBeInTheDocument();
  });
});
