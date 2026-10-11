import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { FirstPasswordScreen } from './FirstPasswordScreen';

const EXPIRED = 'La credencial temporal ya no es válida. Pide una nueva a tu administrador.';
const POLICY = 'La contraseña no cumple los requisitos.';
const failure = (status: number, message: string, extra = {}) => Object.assign(new Error(message), { status, message, ...extra });

function setup(request: ApiClient['request']) {
  const session: Session = { roles: [], access: 'password-change', open: vi.fn(), close: vi.fn() };
  const onSaved = vi.fn();
  render(<FirstPasswordScreen apiClient={{ request }} session={session} onSaved={onSaved} />);
  return { onSaved, session };
}

function fill(first: string, second: string) {
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: first } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: second } });
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

describe('FirstPasswordScreen', () => {
  it('shows the Mockup texts and the five requirements', () => {
    setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu nueva contraseña para asegurar tu cuenta.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('new_password_mismatch_blocks_the_send', () => {
    const request = vi.fn();
    setup(request);
    fill('Abcdef1!x', 'Abcdef1!y');
    save();
    expect(request).not.toHaveBeenCalled();
    const confirm = screen.getByLabelText('Confirmar contraseña');
    expect(confirm.getAttribute('aria-describedby')).toBe(screen.getByText('Las contraseñas no coinciden.').id);
  });

  it('flags an empty new password and sends nothing', () => {
    const request = vi.fn();
    setup(request);
    save();
    expect(request).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Nueva contraseña');
    expect(field.getAttribute('aria-describedby')).toContain(screen.getByText('Ingresa tu nueva contraseña.').id);
  });

  it('sends only the new password to the own-password route', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    setup(request);
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/sessions/password');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({ newPassword: 'Abcdef1!x' });
  });

  it('policy_refusal_is_shown_next_to_the_field', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, 'password is too common')));
    fill('password', 'password');
    save();
    const text = await screen.findByText(POLICY);
    expect(screen.getByLabelText('Nueva contraseña').getAttribute('aria-describedby')).toContain(text.id);
    expect(screen.queryByText('password is too common')).not.toBeInTheDocument();
  });

  it('passwords_are_not_kept_after_sending', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, 'policy')));
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    await screen.findByText(POLICY);
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
  });

  it('saved_password_is_reported_to_the_caller', async () => {
    const { onSaved } = setup(vi.fn().mockResolvedValue(undefined));
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('expired_temporary_credential_shows_its_notice', async () => {
    const { onSaved, session } = setup(vi.fn().mockRejectedValue(failure(401, 'token expired')));
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Guardar contraseña' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('disables the button while sending', async () => {
    let resolve: (value: unknown) => void = () => {};
    setup(vi.fn(() => new Promise((r) => (resolve = r))) as unknown as ApiClient['request']);
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
    await act(async () => resolve(undefined));
  });

  it('shows the common message with the trace id on a network failure', async () => {
    setup(vi.fn().mockRejectedValue(failure(503, 'down', { traceId: 'trace-9' })));
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    expect(await screen.findByText(/No pudimos completar la solicitud/)).toHaveTextContent('trace-9');
  });

  it('describes the new password field with the requirements group', () => {
    setup(vi.fn());
    const group = screen.getByRole('group', { name: 'La contraseña debe contener:' });
    expect(screen.getByLabelText('Nueva contraseña').getAttribute('aria-describedby')).toContain(group.id);
  });

  it('moves focus to the first invalid field after a failed check', () => {
    setup(vi.fn());
    fill('Abcdef1!x', 'Abcdef1!y');
    save();
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveFocus();
  });

  it('moves focus to the new password after the service refuses the policy', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, 'policy')));
    fill('password', 'password');
    save();
    await screen.findByText(POLICY);
    expect(screen.getByLabelText('Nueva contraseña')).toHaveFocus();
  });

  it('shows the policy refusal and the mismatch together', async () => {
    setup(vi.fn().mockRejectedValue(failure(400, 'policy')));
    fill('password', 'password');
    save();
    await screen.findByText(POLICY);
    fill('password', 'other');
    save();
    expect(screen.getByText(POLICY)).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('a newer request replaces the older one', async () => {
    const calls: { signal: AbortSignal; resolve: (value: unknown) => void }[] = [];
    const request = vi.fn((_path: string, init?: { signal?: AbortSignal }) => {
      return new Promise((resolve) => calls.push({ signal: init!.signal!, resolve }));
    });
    const { onSaved } = setup(request as unknown as ApiClient['request']);
    fill('Abcdef1!x', 'Abcdef1!x');
    save();
    await waitFor(() => expect(calls).toHaveLength(1));
    fill('Abcdef1!z', 'Abcdef1!z');
    fireEvent.submit(screen.getByRole('button', { name: 'Guardando…' }).closest('form')!);
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal.aborted).toBe(true);
    await act(async () => calls[0].resolve(undefined));
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => calls[1].resolve(undefined));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
