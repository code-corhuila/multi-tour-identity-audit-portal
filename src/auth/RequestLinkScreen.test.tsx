import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { RequestLinkScreen } from './RequestLinkScreen';

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const SENT = /Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace/;

function setup(request: ApiClient['request']) {
  const onSignIn = vi.fn();
  render(<RequestLinkScreen identifier="acme" apiClient={{ request }} onSignIn={onSignIn} />);
  return { onSignIn };
}
const type = (value: string) => fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value } });
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('RequestLinkScreen', () => {
  it('shows the title, the e-mail field and the way back to sign-in', () => {
    const { onSignIn } = setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Pedir un nuevo enlace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('the_answer_is_the_same_for_every_email: every 202 ends with the same text, whatever the e-mail', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request);
    type('existe@example.com');
    send();
    const first = (await screen.findByText(SENT)).textContent;
    type('nadie@example.com');
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect((await screen.findByText(SENT)).textContent).toBe(first);
    expect(screen.queryByText(/no existe|no encontr|ya está verificad/i)).not.toBeInTheDocument();
  });

  it('posts the trimmed e-mail to the company of the link and nothing else', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request);
    type('  Laura@Example.com ');
    send();
    await screen.findByText(SENT);
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/email-verifications');
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({ email: 'Laura@Example.com' });
    expect(init.headers).toBeUndefined();
  });

  it('malformed_email_is_shown_beside_the_field: an empty e-mail sends nothing', () => {
    const request = vi.fn();
    setup(request);
    send();
    expect(request).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Correo electrónico');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByText('Ingresa tu correo electrónico.').id);
  });

  it('malformed_email_is_shown_beside_the_field: a 400 naming the e-mail goes beside the field', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, { details: [{ field: 'email', message: 'bad shape' }] })));
    type('no-es-un-correo');
    send();
    const text = await screen.findByText('Revisa tu correo electrónico.');
    expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-describedby')).toContain(text.id);
    expect(screen.queryByText(SENT)).not.toBeInTheDocument();
  });

  it('service_failure_shows_the_trace: a fixed text with the trace code and never the message of the answer', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'tr-7', message: 'pg: boom' })));
    type('a@b.co');
    send();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-7/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.queryByText(SENT)).not.toBeInTheDocument();
  });

  it('the button is disabled while sending', async () => {
    let resolve: (v?: unknown) => void = () => {};
    setup(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    type('a@b.co');
    send();
    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled();
    resolve();
  });

  it('password_and_link_are_not_kept: nothing goes to the storage or to the address', async () => {
    const before = window.location.href;
    setup(vi.fn().mockResolvedValue(undefined));
    type('a@b.co');
    send();
    await screen.findByText(SENT);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).toBe(before);
  });
});
