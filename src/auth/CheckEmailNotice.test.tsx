import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { CheckEmailNotice } from './CheckEmailNotice';

function setup(request: ApiClient['request'] = vi.fn().mockResolvedValue(undefined)) {
  const onSignIn = vi.fn();
  render(<CheckEmailNotice identifier="acme" company="Acme Tours" email="laura@example.com" apiClient={{ request }} onSignIn={onSignIn} />);
  return { request, onSignIn };
}

describe('CheckEmailNotice', () => {
  it('the_notice_names_the_company_and_the_email: says the account waits and the link lasts 24 hours', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.getByText('Acme Tours')).toBeInTheDocument();
    expect(screen.getByText('laura@example.com')).toBeInTheDocument();
    expect(screen.getByText(/inactiva/)).toBeInTheDocument();
    expect(screen.getByText(/24 horas/)).toBeInTheDocument();
  });

  it('never says the account can already sign in', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.queryByText(/Cuenta creada\. Inicia sesión\./)).not.toBeInTheDocument();
  });

  it('"Reenviar enlace" asks for a new link for the same e-mail and answers with the common text', async () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const [path, init] = (request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/email-verifications');
    expect(init.body).toEqual({ email: 'laura@example.com' });
    expect(await screen.findByText(/Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace/)).toBeInTheDocument();
  });

  it('service_failure_shows_the_trace when the link cannot be asked for again', async () => {
    setup(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 500, traceId: 'tr-3' })));
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace' }));
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-3/)).toBeInTheDocument();
  });

  it('a 400 that names the e-mail is still told on the message line, as there is no field to put it beside', async () => {
    setup(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 400, details: [{ field: 'email', message: 'bad' }] })));
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace' }));
    expect(await screen.findByText('Revisa tu correo electrónico.')).toBeInTheDocument();
  });

  it('"Ir a iniciar sesión" goes to sign-in', () => {
    const { onSignIn } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ir a iniciar sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
