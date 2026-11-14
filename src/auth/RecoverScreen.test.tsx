import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { RecoverScreen } from './RecoverScreen';

// Portal spec 016, task PR16-01: the screen that asks for a recovery code (RN-PT-16-01, AC-PT-16.1, .5, .6, .7, .8).

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const SENT = /Si existe una cuenta con ese correo, enviamos un código/;

function setup(request: ApiClient['request'], identifier: string | null = 'acme') {
  const onSignIn = vi.fn();
  const onHaveCode = vi.fn();
  render(<RecoverScreen identifier={identifier ?? undefined} apiClient={{ request }} onSignIn={onSignIn} onHaveCode={onHaveCode} />);
  return { onSignIn, onHaveCode };
}
const type = (value: string) => fireEvent.change(screen.getByLabelText('Correo electrónico registrado'), { target: { value } });
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('RecoverScreen', () => {
  it('shows the title, the e-mail field and the way back to sign-in', () => {
    const { onSignIn } = setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Recuperar acceso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico registrado')).toBeInTheDocument();
    expect(screen.queryByText(/solo visual/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('C·the_request_screen_answers_the_same_for_every_e_mail: every 202 ends with the same text', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request);
    type('existe@example.com');
    send();
    const first = (await screen.findByText(SENT)).textContent;
    type('nadie@example.com');
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect((await screen.findByText(SENT)).textContent).toBe(first);
    expect(screen.queryByText(/no existe|no encontr|inactiv/i)).not.toBeInTheDocument();
  });

  it('posts the trimmed e-mail to the company of the link, with no key and nothing else', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request);
    type('  Laura@Example.com ');
    send();
    await screen.findByText(SENT);
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/password-recoveries');
    expect(init).toMatchObject({ method: 'POST', body: { email: 'Laura@Example.com' } });
    expect(init.headers).toBeUndefined();
  });

  it('C·the_platform_asks_at_the_platform_route: no company in the path', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request, null);
    type('root@multitour.example');
    send();
    await screen.findByText(SENT);
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/platform/password-recoveries');
  });

  it('C·the_request_screen_leads_to_the_reset_screen_with_the_e_mail', async () => {
    const { onHaveCode } = setup(vi.fn().mockResolvedValue(undefined));
    type('ana@example.com');
    send();
    await screen.findByText(SENT);
    fireEvent.click(screen.getByRole('button', { name: 'Ya tengo el código' }));
    expect(onHaveCode).toHaveBeenCalledWith('ana@example.com');
  });

  it('asks for the e-mail before sending anything', () => {
    const request = vi.fn();
    setup(request);
    send();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('a 400 that names the e-mail goes beside the field, and the typed value stays', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, { details: [{ field: 'email', message: 'x' }] })));
    type('no-at-sign');
    send();
    expect(await screen.findByText('Revisa el correo electrónico.')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico registrado')).toHaveValue('no-at-sign');
  });

  it('C·an_unknown_failure_shows_no_detail: the generic text and the trace code, nothing of the answer', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'trace-9', message: 'stack at db.Host' })));
    type('ana@example.com');
    send();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\. \(Código de seguimiento: trace-9\)/)).toBeInTheDocument();
    expect(screen.queryByText(/db\.Host/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ya tengo el código' })).not.toBeInTheDocument();
  });

  it('C·the_button_is_disabled_while_sending: one request, not two', async () => {
    let release!: () => void;
    const request = vi.fn().mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
    setup(request);
    type('ana@example.com');
    send();
    const button = await screen.findByRole('button', { name: 'Enviando…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(request).toHaveBeenCalledTimes(1);
    release();
    await screen.findByText(SENT);
  });

  it('C·the_code_and_the_e_mail_are_never_stored: nothing in the web storage', async () => {
    setup(vi.fn().mockResolvedValue(undefined));
    type('ana@example.com');
    send();
    await screen.findByText(SENT);
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
  });
});
