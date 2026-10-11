import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { RegisterTenantScreen } from './RegisterTenantScreen';
import { TenantsApp } from './TenantsApp';

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const saga = (over = {}) => ({
  id: '0b6f4a1e-3c1d-4e0a-9d52-1f3f6f0c9a11',
  status: 'COMPLETED',
  completedSteps: ['CREATE_TENANT', 'CREATE_ACCOUNT', 'APPLY_STATUS'],
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  createdAt: '2026-10-11T10:00:00Z',
  updatedAt: '2026-10-11T10:00:01Z',
  ...over,
});
const START = '/api/v1/sagas/onboard-tenant';

function setup(request: ApiClient['request']) {
  const onBack = vi.fn();
  render(<RegisterTenantScreen apiClient={{ request }} onBack={onBack} pollMs={0} />);
  return { onBack };
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const passwords = (value = 'Viaje-2026!') => {
  type('Contraseña inicial', value);
  type('Confirmar contraseña', value);
};
function fillAll() {
  type('Identificador', 'sierra-azul');
  type('Nombre comercial', 'Sierra Azul');
  type('Nombre completo del administrador', 'Ana Gómez');
  type('Correo electrónico del administrador', 'ana@sierra.co');
  passwords();
}
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar operador' }));
const described = (label: string) => screen.getByLabelText(label).getAttribute('aria-describedby') ?? '';

describe('RegisterTenantScreen', () => {
  it('registration_fields_have_a_label: one label per field', () => {
    setup(vi.fn());
    for (const label of [
      'Identificador',
      'Nombre comercial',
      'Zona horaria',
      'País',
      'Estado inicial',
      'Nombre completo del administrador',
      'Correo electrónico del administrador',
      'Contraseña inicial',
      'Confirmar contraseña',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('required_fields_are_flagged_and_not_sent: each error is beside its field', () => {
    const request = vi.fn();
    setup(request);
    send();
    expect(request).not.toHaveBeenCalled();
    for (const label of ['Identificador', 'Nombre comercial', 'Nombre completo del administrador', 'Correo electrónico del administrador', 'Contraseña inicial']) {
      expect(screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
      expect(described(label)).not.toBe('');
    }
  });

  it('an identifier that is not kebab-case is flagged and not sent', () => {
    const request = vi.fn();
    setup(request);
    fillAll();
    type('Identificador', 'Sierra Azul');
    send();
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Identificador').getAttribute('aria-invalid')).toBe('true');
  });

  it('password_mismatch_blocks_the_send', () => {
    const request = vi.fn();
    setup(request);
    fillAll();
    type('Confirmar contraseña', 'Otra-2026!');
    send();
    expect(request).not.toHaveBeenCalled();
    expect(described('Confirmar contraseña')).toContain(screen.getByText('Las contraseñas no coinciden.').id);
  });

  it('posts the onboarding with an Idempotency-Key and says the credential is temporary for 72 hours', async () => {
    const request = vi.fn().mockResolvedValue(saga());
    setup(request);
    fillAll();
    send();
    expect(await screen.findByText(/válida por 72 horas/)).toBeInTheDocument();
    const [path, init] = request.mock.calls[0];
    expect(path).toBe(START);
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({
      identifier: 'sierra-azul',
      commercialName: 'Sierra Azul',
      timeZone: 'America/Bogota',
      country: 'CO',
      initialStatus: 'ACTIVE',
      administrator: { fullName: 'Ana Gómez', email: 'ana@sierra.co', password: 'Viaje-2026!' },
    });
    expect(init.headers['Idempotency-Key']).toMatch(/^.{8,128}$/);
    // The form is gone after success: no field keeps the password.
    expect(screen.queryByLabelText('Contraseña inicial')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('Viaje-2026!');
  });

  it('the selects are wired: a chosen status is sent', async () => {
    const request = vi.fn().mockResolvedValue(saga());
    setup(request);
    fillAll();
    type('Estado inicial', 'INACTIVE');
    send();
    await screen.findByText(/válida por 72 horas/);
    expect(request.mock.calls[0][1].body.initialStatus).toBe('INACTIVE');
  });

  it('a 200 for a repeated key shows the same saga as a 201', async () => {
    setup(vi.fn().mockResolvedValue(saga({ id: 'aaaaaaaa-3c1d-4e0a-9d52-1f3f6f0c9a11' })));
    fillAll();
    send();
    expect(await screen.findByText(/válida por 72 horas/)).toBeInTheDocument();
  });

  it('a failed read while polling shows the fixed text and offers the refresh', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(saga({ status: 'RUNNING', completedSteps: ['CREATE_TENANT'] }))
      .mockRejectedValueOnce(failure(500, { traceId: 'tr-8' }));
    setup(request);
    fillAll();
    send();
    expect(await screen.findByText(/tr-8/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeInTheDocument();
  });

  it('submit_is_disabled_while_sending', async () => {
    let resolve: (v?: unknown) => void = () => {};
    setup(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    fillAll();
    send();
    expect(await screen.findByRole('button', { name: 'Registrando…' })).toBeDisabled();
    resolve(saga());
    await screen.findByText(/válida por 72 horas/);
  });

  it('password_is_not_kept_after_sending: a failed send clears both and shows a fixed text with the trace id', async () => {
    setup(vi.fn().mockRejectedValue(failure(500, { traceId: 'tr-3', message: 'pg: boom' })));
    fillAll();
    send();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-3/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña inicial')).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('Sierra Azul');
  });

  it('field errors of a 400 go beside their fields, with the administrator prefix removed', async () => {
    const details = [
      { field: 'identifier', message: 'taken' },
      { field: 'administrator.email', message: 'bad' },
      { field: 'administrator.password', message: 'weak' },
    ];
    setup(vi.fn().mockRejectedValue(failure(400, { details })));
    fillAll();
    send();
    await waitFor(() => expect(described('Identificador')).not.toBe(''));
    expect(described('Correo electrónico del administrador')).not.toBe('');
    expect(described('Contraseña inicial')).toContain(screen.getByText('La contraseña no cumple los requisitos.').id);
    expect(screen.queryByText('taken')).not.toBeInTheDocument();
  });

  it('a running saga is read again until it completes', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(saga({ status: 'RUNNING', completedSteps: ['CREATE_TENANT'] }))
      .mockResolvedValueOnce(saga({ status: 'RUNNING', completedSteps: ['CREATE_TENANT'] }))
      .mockResolvedValueOnce(saga());
    setup(request);
    fillAll();
    send();
    expect(await screen.findByText(/válida por 72 horas/)).toBeInTheDocument();
    expect(request.mock.calls[1][0]).toBe(`${START}/${saga().id}`);
    expect(request.mock.calls[1][1]?.method ?? 'GET').toBe('GET');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('the polling is bounded and then offers a manual refresh', async () => {
    const request = vi.fn().mockResolvedValue(saga({ status: 'RUNNING', completedSteps: ['CREATE_TENANT'] }));
    setup(request);
    fillAll();
    send();
    expect(await screen.findByRole('button', { name: 'Actualizar estado' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(request).toHaveBeenCalledTimes(11);
    expect(screen.queryByText(/válida por 72 horas/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }));
    await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(11));
    expect(request.mock.calls[11][0]).toBe(`${START}/${saga().id}`);
    expect(request.mock.calls[11][1].method).toBe('GET');
    expect(request.mock.calls[11][1].headers).toBeUndefined();
  });

  it.each([
    ['COMPENSATED', 'CREATE_ACCOUNT', 'No se pudo crear la cuenta del primer administrador.'],
    ['FAILED', 'APPLY_STATUS', 'No se pudo aplicar el estado inicial.'],
    ['COMPENSATED', 'CREATE_TENANT', 'No se pudo crear el operador.'],
  ])('failed_step_is_shown: %s at %s', async (status, failedStep, line) => {
    setup(vi.fn().mockResolvedValue(saga({ status, failedStep, completedSteps: [] })));
    fillAll();
    send();
    expect(await screen.findByText(new RegExp(line))).toBeInTheDocument();
    expect(screen.queryByText(/válida por 72 horas/)).not.toBeInTheDocument();
  });

  it('retry_with_the_same_data_reuses_the_key and changed data takes a new one', async () => {
    const request = vi.fn().mockRejectedValue(failure(500));
    setup(request);
    fillAll();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar operador' })).toBeEnabled());
    passwords();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar operador' })).toBeEnabled());
    type('Nombre comercial', 'Sierra Azul SAS');
    passwords();
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    const keys = request.mock.calls.map(([, init]) => init.headers['Idempotency-Key']);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('the back link goes to the list', () => {
    const { onBack } = setup(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Volver a operadores' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('TenantsApp navigation', () => {
  const admin: Session = { roles: ['PLATFORM_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };
  const list = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  it('the list opens the form and the form returns to the list', async () => {
    const request = vi.fn().mockResolvedValue(list);
    render(<TenantsApp apiClient={{ request }} session={admin} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar operador' }));
    expect(screen.getByLabelText('Identificador')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a operadores' }));
    expect(await screen.findByRole('heading', { name: 'Operadores' })).toBeInTheDocument();
  });
});
