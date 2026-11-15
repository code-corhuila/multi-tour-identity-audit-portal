import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { VerifyEmailScreen } from './VerifyEmailScreen';

const TOKEN = 'T'.repeat(43);
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const BAD_LINK = /Este enlace ya no funciona/;

function setup(request: ApiClient['request'], token: string | null = TOKEN) {
  const onSignIn = vi.fn();
  const onRequestLink = vi.fn();
  render(<VerifyEmailScreen identifier="acme" apiClient={{ request }} token={token ?? undefined} onSignIn={onSignIn} onRequestLink={onRequestLink} />);
  return { onSignIn, onRequestLink };
}
const type = (value: string) => fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value } });
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Verificar correo' }));

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('VerifyEmailScreen', () => {
  it('shows the title, the explanation, the password field with "Ver" and the button', () => {
    setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.getByText('Para activar tu cuenta, confirma la contraseña con la que la creaste.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar correo' })).toBeInTheDocument();
  });

  it('a_page_without_a_link_offers_a_new_one: no link shows the bad-link screen and sends nothing', () => {
    const request = vi.fn();
    const { onRequestLink } = setup(request, null);
    expect(screen.getByText(BAD_LINK)).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir un nuevo enlace' }));
    expect(onRequestLink).toHaveBeenCalledTimes(1);
  });

  it('a password is required and nothing is sent without it', () => {
    const request = vi.fn();
    setup(request);
    send();
    expect(request).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Contraseña');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toContain(screen.getByText('Ingresa tu contraseña.').id);
  });

  it('the required error goes away as soon as a password is typed', () => {
    setup(vi.fn());
    send();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
    type('V');
    expect(screen.queryByText('Ingresa tu contraseña.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid');
  });

  it('confirmed_link_shows_verified_and_the_way_to_sign_in: posts the link and the password, no key, and opens no session', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const { onSignIn } = setup(request);
    type('Viaje-2026!');
    send();
    expect(await screen.findByText('Tu correo quedó verificado y tu cuenta está activa.')).toBeInTheDocument();
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/email-verifications/confirmations');
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({ token: TOKEN, password: 'Viaje-2026!' });
    expect(init.headers).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('wrong_password_stays_on_the_page: says so beside the field, clears it and keeps the same link for the retry', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(401)).mockResolvedValueOnce(undefined);
    setup(request);
    type('Equivocada-1!');
    send();
    const text = await screen.findByText('La contraseña no es correcta.');
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toContain(text.id);
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.queryByText(BAD_LINK)).not.toBeInTheDocument();
    type('Viaje-2026!');
    send();
    expect(await screen.findByText('Tu correo quedó verificado y tu cuenta está activa.')).toBeInTheDocument();
    expect(request.mock.calls[1][1].body).toEqual({ token: TOKEN, password: 'Viaje-2026!' });
  });

  it('a_bad_link_shows_it_does_not_work: a 422 shows the bad-link screen with the way to a new link', async () => {
    const request = vi.fn().mockRejectedValue(failure(422, { traceId: 'tr-1' }));
    const { onRequestLink } = setup(request);
    type('Viaje-2026!');
    send();
    expect(await screen.findByText(BAD_LINK)).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir un nuevo enlace' }));
    expect(onRequestLink).toHaveBeenCalledTimes(1);
  });

  it('other failures keep the page and show a fixed text with the trace code, never the message of the answer', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'tr-5', message: 'pg: boom' })));
    type('Viaje-2026!');
    send();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-5/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('the button is disabled while sending', async () => {
    let resolve: (v?: unknown) => void = () => {};
    setup(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    type('Viaje-2026!');
    send();
    expect(await screen.findByRole('button', { name: 'Verificando…' })).toBeDisabled();
    resolve();
  });

  it('password_and_link_are_not_kept: cleared once sent, nothing in the storage, the link not shown anywhere', async () => {
    const before = window.location.href;
    setup(vi.fn().mockRejectedValue(failure(401)));
    type('Viaje-2026!');
    send();
    await screen.findByText('La contraseña no es correcta.');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).toBe(before);
    expect(document.body.innerHTML).not.toContain(TOKEN);
  });

  it('never asks for or shows a way to recover the password in this version', () => {
    setup(vi.fn());
    expect(screen.queryByText(/olvidaste/i)).not.toBeInTheDocument();
  });
});
