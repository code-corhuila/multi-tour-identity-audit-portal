import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { AuditAccess } from '../data/auditAccess';
import { OptionalRolesPanel } from './OptionalRolesPanel';

const PATH = '/api/v1/identity-audit/tenant/audit-access';

// The container's client: the list answers the three roles (in an order the screen must not rely on) and every change answers
// what the test says. A request the test did not plan fails with a clear message.
function clientFor(options: { list?: AuditAccess[] | Error; set?: (role: string, enabled: boolean) => Promise<AuditAccess> } = {}) {
  const list = options.list ?? [
    { role: 'ACCOUNTANT', enabled: true },
    { role: 'MANAGER', enabled: false },
    { role: 'ANALYST', enabled: false },
  ];
  const request = vi.fn(async (path: string, init?: { method?: string; body?: { enabled: boolean } }) => {
    if (path === PATH) {
      if (list instanceof Error) throw list;
      return { data: list };
    }
    const role = path.slice(PATH.length + 1);
    if (init?.method === 'PUT' && options.set) return options.set(role, init.body!.enabled);
    throw new Error('a request that the test did not expect');
  });
  return { request, apiClient: { request } as unknown as ApiClient };
}

const show = (apiClient: ApiClient) => render(<OptionalRolesPanel apiClient={apiClient} />);
const audit = (role: string) => screen.findByRole('checkbox', { name: `Acceso a auditoría de ${role}` });

describe('switches of the audit access of the optional roles (spec 015, RN-IDA-PT-37 and -38)', () => {
  it('U·audit_access_switches_show_the_three_roles_as_the_service_says: one switch per role, each as the service answered, whatever the order', async () => {
    const { request, apiClient } = clientFor();
    show(apiClient);

    expect(await audit('Gerente')).not.toBeChecked();
    expect(await audit('Contador')).toBeChecked();
    expect(await audit('Analista')).not.toBeChecked();
    // asked once, for the three roles; the switch that enables the role itself is still there and still local (gap G-3)
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(PATH);
    expect(screen.getByRole('checkbox', { name: 'Contador' })).not.toBeChecked();
    expect(screen.getAllByText('Auditoría del tenant')).toHaveLength(3);
  });

  it('U·changing_a_switch_asks_the_service_and_shows_what_it_answered: the role goes in the path, the switch waits for the answer and then shows it', async () => {
    let answer: (a: AuditAccess) => void = () => {};
    const { request, apiClient } = clientFor({ set: () => new Promise<AuditAccess>((resolve) => (answer = resolve)) });
    show(apiClient);
    const manager = await audit('Gerente');

    fireEvent.click(manager);

    expect(request).toHaveBeenLastCalledWith(`${PATH}/MANAGER`, expect.objectContaining({ method: 'PUT', body: { enabled: true } }));
    // until the service answers the switch is not changed and cannot be pressed again
    expect(manager).not.toBeChecked();
    expect(manager).toBeDisabled();
    // only the role that waits is blocked: the others can be pressed meanwhile
    expect(await audit('Contador')).not.toBeDisabled();
    expect(await audit('Analista')).not.toBeDisabled();
    answer({ role: 'MANAGER', enabled: true });
    await waitFor(() => expect(manager).toBeChecked());
    expect(manager).not.toBeDisabled();
    expect(screen.getByText('Acceso a la auditoría de Gerente habilitado.')).toBeInTheDocument();

    answer = () => {};
    fireEvent.click(manager);
    answer({ role: 'MANAGER', enabled: false });
    await waitFor(() => expect(manager).not.toBeChecked());
    expect(screen.getByText('Acceso a la auditoría de Gerente retirado.')).toBeInTheDocument();
  });

  it('U·a_failed_change_leaves_the_switch_as_it_was: a refusal or a lost race says so and the switch keeps what it had', async () => {
    const failures = [Object.assign(new Error('forbidden'), { status: 403 }), Object.assign(new Error('race'), { status: 422 })];
    const { apiClient } = clientFor({ set: async () => Promise.reject(failures.shift()) });
    show(apiClient);
    const analyst = await audit('Analista');

    fireEvent.click(analyst);
    expect(await screen.findByText('No pudimos cambiar el acceso a la auditoría de Analista. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(analyst).not.toBeChecked();
    expect(analyst).not.toBeDisabled();
    // a lost race (422) is the same refusal to the person: the same message and the switch as it was
    fireEvent.click(analyst);
    await waitFor(() => expect(screen.getByText('No pudimos cambiar el acceso a la auditoría de Analista. Inténtalo de nuevo.')).toBeInTheDocument());
    expect(analyst).not.toBeChecked();
  });

  it('U·a_failed_change_keeps_a_switch_that_was_on: removing the access fails and the switch stays on', async () => {
    const { apiClient } = clientFor({ set: async () => Promise.reject(Object.assign(new Error('down'), { status: 500 })) });
    show(apiClient);
    const accountant = await audit('Contador');
    expect(accountant).toBeChecked();

    fireEvent.click(accountant);

    expect(await screen.findByText('No pudimos cambiar el acceso a la auditoría de Contador. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(accountant).toBeChecked();
  });

  it('U·a_failed_read_of_the_audit_access_offers_a_retry_and_no_switches: the rest of the panel stays', async () => {
    const { request, apiClient } = clientFor({ list: new Error('down') });
    show(apiClient);

    expect(await screen.findByText('No pudimos cargar el acceso a la auditoría.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Acceso a auditoría de/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Gerente' })).toBeInTheDocument();
    request.mockImplementation(async () => ({ data: [{ role: 'MANAGER', enabled: true }, { role: 'ACCOUNTANT', enabled: false }, { role: 'ANALYST', enabled: false }] }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Roles opcionales del tenant' })).getByRole('button', { name: 'Reintentar' }));

    expect(await audit('Gerente')).toBeChecked();
  });

  it('U·without_a_client_the_panel_has_no_audit_switches: an older caller keeps the panel it had', () => {
    render(<OptionalRolesPanel />);
    expect(screen.queryByRole('checkbox', { name: /Acceso a auditoría de/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Gerente' })).toBeInTheDocument();
  });
});
