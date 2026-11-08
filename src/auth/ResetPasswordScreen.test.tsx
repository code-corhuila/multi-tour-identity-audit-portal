import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { ResetPasswordScreen } from './ResetPasswordScreen';

// Portal spec 016, task PR16-02: the screen that chooses the new password with the code (RN-PT-16-02 to -04, AC-PT-16.2 to .6, .8).

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const NEW = 'Viaje-2026!nuevo';
const REFUSED = 'El código no es válido o venció. Pide uno nuevo.';

function setup(request: ApiClient['request'], identifier: string | null = 'acme', initialEmail = 'ana@example.com') {
  const onSignIn = vi.fn();
  const onAskAgain = vi.fn();
  render(<ResetPasswordScreen identifier={identifier ?? undefined} apiClient={{ request }} initialEmail={initialEmail} onSignIn={onSignIn} onAskAgain={onAskAgain} />);
  return { onSignIn, onAskAgain };
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fill = (code = '48213907', password = NEW, confirmation = password) => {
  type('Código', code);
  type('Nueva contraseña', password);
  type('Confirmar contraseña', confirmation);
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('ResetPasswordScreen', () => {
  it('shows the fields, starts with the e-mail already typed and offers the way back', () => {
    const { onSignIn } = setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico registrado')).toHaveValue('ana@example.com');
    expect(screen.getByLabelText('Código')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.queryByText(/solo visual/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('C·a_valid_reset_says_the_sessions_were_closed: one POST with the four fields, no key, and the way to sign in', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const { onSignIn } = setup(request);
    fill();
    save();
    expect(await screen.findByText(/Tu contraseña cambió y se cerraron todas tus sesiones/)).toBeInTheDocument();
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/password-recoveries/resets');
    expect(init).toMatchObject({
      method: 'POST',
      body: { email: 'ana@example.com', code: '48213907', newPassword: NEW, newPasswordConfirmation: NEW },
    });
    expect(init.headers).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('the platform resets at the platform route', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request, null, 'root@multitour.example');
    fill();
    save();
    await screen.findByText(/Tu contraseña cambió/);
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/platform/password-recoveries/resets');
  });

  it('C·a_confirmation_that_differs_sends_nothing: the message is beside the field', () => {
    const request = vi.fn();
    setup(request);
    fill('48213907', NEW, NEW + 'x');
    save();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('aria-invalid', 'true');
    expect(request).not.toHaveBeenCalled();
  });

  it('asks for what is missing before sending anything: the e-mail, a code of eight digits and the new password', () => {
    const request = vi.fn();
    setup(request, 'acme', '');
    save();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('El código tiene 8 dígitos.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu nueva contraseña.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('C·a_bad_new_password_is_shown_by_its_field: the data stays, the passwords are cleared', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, { details: [{ field: 'newPassword', message: 'x' }] })));
    fill();
    save();
    const field = screen.getByLabelText('Nueva contraseña');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('La contraseña no cumple los requisitos.')).toBeInTheDocument();
    expect(screen.getByLabelText('Código')).toHaveValue('48213907');
    expect(screen.getByLabelText('Correo electrónico registrado')).toHaveValue('ana@example.com');
    expect(field).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
  });

  it('a 400 that names the code or the e-mail goes beside that field', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, { details: [{ field: 'code', message: 'x' }] })));
    fill();
    save();
    await waitFor(() => expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true'));
  });

  it('C·every_refused_code_reads_the_same: one message and the way to ask again, whatever the reason', async () => {
    const { onAskAgain } = setup(vi.fn().mockRejectedValue(failure(422, { code: 'BUSINESS_RULE_VIOLATION', message: 'wrong try 3 of 5' })));
    fill();
    save();
    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.queryByText(/wrong try|intento/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir un código nuevo' }));
    expect(onAskAgain).toHaveBeenCalledTimes(1);
  });

  it('C·an_unknown_failure_shows_no_detail: the generic text and the trace code, nothing of the answer', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'trace-9', message: 'stack at db.Host' })));
    fill();
    save();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\. \(Código de seguimiento: trace-9\)/)).toBeInTheDocument();
    expect(screen.queryByText(/db\.Host/)).not.toBeInTheDocument();
  });

  it('C·the_button_is_disabled_while_saving: one request, not two', async () => {
    let release!: () => void;
    const request = vi.fn().mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
    setup(request);
    fill();
    save();
    const button = await screen.findByRole('button', { name: 'Guardando…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(request).toHaveBeenCalledTimes(1);
    release();
    await screen.findByText(/Tu contraseña cambió/);
  });

  it('C·the_code_is_never_stored: nothing in the web storage, before or after the answer', async () => {
    setup(vi.fn().mockResolvedValue(undefined));
    fill();
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
    save();
    await screen.findByText(/Tu contraseña cambió/);
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
  });

  it('C·the_passwords_are_cleared_after_a_refused_code_too', async () => {
    setup(vi.fn().mockRejectedValue(failure(422)));
    fill();
    save();
    await screen.findByText(REFUSED);
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Código')).toHaveValue('48213907');
  });
});
