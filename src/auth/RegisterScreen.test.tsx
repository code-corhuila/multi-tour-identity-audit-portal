import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { RegisterScreen } from './RegisterScreen';

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });

function setup(request: ApiClient['request']) {
  const onDone = vi.fn();
  const onSignIn = vi.fn();
  render(<RegisterScreen identifier="acme" apiClient={{ request }} onDone={onDone} onSignIn={onSignIn} />);
  return { onDone, onSignIn };
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const passwords = (value = 'Viaje-2026!') => {
  type('Contraseña', value);
  type('Confirmar contraseña', value);
};
function fillAll() {
  type('Nombre', 'Laura');
  type('Apellido', 'Pérez');
  type('Correo electrónico', ' Laura@Example.com ');
  type('Número de teléfono', '300 123 4567');
  passwords();
}
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
const described = (label: string) => screen.getByLabelText(label).getAttribute('aria-describedby') ?? '';

describe('RegisterScreen', () => {
  it('signup_fields_have_label_and_error: shows the Mockup texts and one label per field', () => {
    setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Únete a la plataforma y crea tu acceso para comenzar.')).toBeInTheDocument();
    for (const label of ['Nombre', 'Apellido', 'Correo electrónico', 'Número de teléfono', 'Contraseña', 'Confirmar contraseña']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('requirements_box_is_visible: lists the five requirements', () => {
    setup(vi.fn());
    expect(screen.getByText('La contraseña debe contener:')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('required_fields_are_flagged_and_not_sent', () => {
    const request = vi.fn();
    setup(request);
    send();
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa tu nombre.')).toBeInTheDocument();
    for (const label of ['Nombre', 'Apellido', 'Correo electrónico', 'Número de teléfono', 'Contraseña']) {
      expect(screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
      expect(described(label)).not.toBe('');
    }
  });

  it('password_mismatch_blocks_the_send', () => {
    const request = vi.fn();
    setup(request);
    fillAll();
    type('Confirmar contraseña', 'Otra-2026!');
    send();
    expect(request).not.toHaveBeenCalled();
    expect(described('Confirmar contraseña')).toBe(screen.getByText('Las contraseñas no coinciden.').id);
  });

  it('company_comes_from_the_link: posts the body with an Idempotency-Key and goes on at 201', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'a1' });
    const { onDone } = setup(request);
    fillAll();
    send();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/security/public/tenants/acme/accounts');
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({
      firstName: 'Laura',
      lastName: 'Pérez',
      email: 'Laura@Example.com',
      phone: '300 123 4567',
      password: 'Viaje-2026!',
      passwordConfirmation: 'Viaje-2026!',
    });
    expect(init.headers['Idempotency-Key']).toMatch(/^.{8,128}$/);
  });

  it('submit_is_disabled_while_sending', async () => {
    let resolve: (v?: unknown) => void = () => {};
    const request = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    setup(request);
    fillAll();
    send();
    const button = await screen.findByRole('button', { name: 'Registrando…' });
    expect(button).toBeDisabled();
    resolve();
  });

  it('passwords_are_not_kept_after_sending', async () => {
    const request = vi.fn().mockRejectedValue(failure(500));
    setup(request);
    fillAll();
    send();
    await waitFor(() => expect(request).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrarse' })).toBeEnabled());
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Laura');
  });

  it('policy_refusal_is_shown_with_its_reason: the 400 details go beside their fields', async () => {
    const details = [
      { field: 'password', message: 'too common' },
      { field: 'phone', message: 'bad shape' },
    ];
    setup(vi.fn().mockRejectedValue(failure(400, { details })));
    fillAll();
    send();
    expect(await screen.findByText('La contraseña no cumple los requisitos.')).toBeInTheDocument();
    expect(described('Contraseña')).toContain(screen.getByText('La contraseña no cumple los requisitos.').id);
    expect(described('Número de teléfono')).toContain(screen.getByText('Revisa tu número de teléfono.').id);
    expect(screen.queryByText('too common')).not.toBeInTheDocument();
  });

  it('used_email_error_is_next_to_the_field', async () => {
    setup(vi.fn().mockRejectedValue(failure(422, { details: [{ field: 'email', message: 'in use' }] })));
    fillAll();
    send();
    const text = await screen.findByText('Este correo ya está en uso en esta empresa');
    expect(described('Correo electrónico')).toContain(text.id);
  });

  it('inactive_company_refusal_is_shown: a 422 that names no field goes to the message line', async () => {
    const { onDone } = setup(vi.fn().mockRejectedValue(failure(422)));
    fillAll();
    send();
    expect(await screen.findByText('El registro no está disponible para esta empresa')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('other statuses get a fixed neutral text with the trace id', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'tr-9', message: 'pg: boom' })));
    fillAll();
    send();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-9/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });

  it('retry_with_the_same_data_reuses_the_key and changed_data_takes_a_new_key', async () => {
    const request = vi.fn().mockRejectedValue(failure(500));
    setup(request);
    fillAll();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrarse' })).toBeEnabled());
    passwords();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrarse' })).toBeEnabled());
    type('Nombre', 'Lauren');
    passwords();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    const keys = request.mock.calls.map(([, init]) => init.headers['Idempotency-Key']);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('uses the wide sign-up card of the Mockup', () => {
    setup(vi.fn());
    expect(document.querySelector('.auth-card--wide')).not.toBeNull();
  });

  it('the footer link goes back to sign-in', () => {
    const { onSignIn } = setup(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Inicia sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
