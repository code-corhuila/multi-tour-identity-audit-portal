import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { SignInScreen } from './SignInScreen';

const REFUSED = 'Correo o contraseña incorrectos';
const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

function setup(identifier: string | undefined, request: ApiClient['request']) {
  const apiClient: ApiClient = { request };
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  render(<SignInScreen identifier={identifier} apiClient={apiClient} session={session} />);
  return session;
}

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
}

const submit = (name = 'Iniciar sesión') => fireEvent.click(screen.getByRole('button', { name }));
const refusal = (status: number, message: string) => Object.assign(new Error(message), { status, message });

describe('SignInScreen at a company', () => {
  it('shows the Mockup texts and the link to the registration of that company', () => {
    setup('acme', vi.fn());
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa a tu cuenta para gestionar tus viajes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/t/acme/sign-up');
  });

  it('empty_fields_are_flagged_and_not_sent', () => {
    const request = vi.fn();
    setup('acme', request);
    submit();
    expect(request).not.toHaveBeenCalled();
    const email = screen.getByLabelText('Correo electrónico');
    const password = screen.getByLabelText('Contraseña');
    expect(email.getAttribute('aria-describedby')).toBe(screen.getByText('Ingresa tu correo electrónico.').id);
    expect(password.getAttribute('aria-describedby')).toBe(screen.getByText('Ingresa tu contraseña.').id);
  });

  it('tenant_form_uses_the_identifier_of_the_link', async () => {
    const request = vi.fn().mockResolvedValue(answer);
    setup('acme', request);
    fill('ana@acme.co', 'secret-pass');
    submit();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/sessions');
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({ email: 'ana@acme.co', password: 'secret-pass' });
  });

  it('good_answer_is_handed_to_the_session', async () => {
    const request = vi.fn().mockResolvedValue(answer);
    const apiClient: ApiClient = { request };
    const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
    render(<SignInScreen identifier="acme" apiClient={apiClient} session={session} />);
    fill('ana@acme.co', 'secret-pass');
    submit();
    await waitFor(() => expect(session.open).toHaveBeenCalledWith(answer));
  });

  it('submit_is_disabled_while_sending', async () => {
    let resolve: (value: unknown) => void = () => {};
    const request = vi.fn(() => new Promise((r) => (resolve = r)));
    setup('acme', request as unknown as ApiClient['request']);
    fill('ana@acme.co', 'secret-pass');
    submit();
    const sending = await screen.findByRole('button', { name: 'Ingresando…' });
    expect(sending).toBeDisabled();
    await act(async () => resolve(answer));
  });

  it.each([
    'Invalid password',
    'Unknown e-mail',
    'Account of another tenant',
    'Account blocked',
    'Account inactive',
  ])('every_401_shows_the_same_text: %s', async (serviceMessage) => {
    setup('acme', vi.fn().mockRejectedValue(refusal(401, serviceMessage)));
    fill('ana@acme.co', 'wrong');
    submit();
    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.queryByText(serviceMessage)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });

  it('answer_message_is_not_shown: a 400 gets the same fixed text', async () => {
    setup('acme', vi.fn().mockRejectedValue(refusal(400, 'field email is bad')));
    fill('ana@acme.co', 'x');
    submit();
    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.queryByText('field email is bad')).not.toBeInTheDocument();
  });

  it('shows the common message with the trace id on a network failure and lets the person retry', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'TIMEOUT', traceId: 'trace-1' }))
      .mockResolvedValueOnce(answer);
    const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
    render(<SignInScreen identifier="acme" apiClient={{ request }} session={session} />);
    fill('ana@acme.co', 'secret-pass');
    submit();
    expect(await screen.findByText(/No pudimos completar la solicitud/)).toHaveTextContent('trace-1');
    submit();
    await waitFor(() => expect(session.open).toHaveBeenCalledWith(answer));
  });
});

describe('SignInScreen of the platform', () => {
  it('shows the platform texts and the way back', () => {
    setup(undefined, vi.fn());
    expect(screen.getByText('Multi tour / entorno interno')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acceso de plataforma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al acceso general' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });

  it('platform_form_uses_the_platform_route', async () => {
    const request = vi.fn().mockResolvedValue(answer);
    setup(undefined, request);
    fill('root@multitour.co', 'secret-pass');
    submit('Ingresar a plataforma');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/platform/sessions');
  });
});
