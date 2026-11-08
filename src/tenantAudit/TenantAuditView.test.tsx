import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { AuditPage, AuditRecordResponse } from '../data/audit';
import { TenantAuditView } from './TenantAuditView';

const TENANT = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e4f0a11';
const ACTOR = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const PATH = '/api/v1/identity-audit/tenant/audit-records?page=1&limit=20';

const enabled: AuditRecordResponse = {
  auditRecordId: '00000000-0000-4000-8000-000000000011',
  tenantId: TENANT,
  actorId: ACTOR,
  action: 'AUDIT_ACCESS_ENABLED',
  affectedRecordId: `roles/ACCOUNTANT`,
  reason: 'El contador revisa el cierre',
  previousValue: { enabled: false },
  newValue: { enabled: true },
  channelOrModule: 'ADMIN_PORTAL',
  functionalProcessReference: 'AUDIT_ACCESS',
  recordedAt: '2026-11-06T14:32:00Z',
};
const blocked: AuditRecordResponse = {
  auditRecordId: '00000000-0000-4000-8000-000000000012',
  tenantId: TENANT,
  actorId: 'multi-tour-security',
  action: 'PAYMENT_VALIDATED',
  affectedRecordId: 'payments/1',
  recordedAt: '2026-11-05T09:05:00Z',
};
const records = [enabled, blocked];

const pageOf = (data: AuditRecordResponse[]): AuditPage => ({ data, meta: { page: 1, limit: 20, total: data.length, totalPages: data.length ? 1 : 0 } });
const refused = () => Object.assign(new Error('forbidden'), { status: 403 });

// The container's client: `request` answers in order, and a request that the test did not plan fails with a clear message.
function clientFor(...answers: Array<AuditPage | Promise<AuditPage> | Error>) {
  const request = vi.fn<(path: string) => Promise<AuditPage>>(async () => {
    throw new Error('a request that the test did not expect');
  });
  answers.forEach((a) => request.mockImplementationOnce(() => (a instanceof Error ? Promise.reject(a) : Promise.resolve(a))));
  return { request, apiClient: { request } as unknown as ApiClient };
}

const show = (apiClient: ApiClient, administrator = true) => render(<TenantAuditView apiClient={apiClient} administrator={administrator} />);

// jsdom has no modal dialog: the stub opens and closes it the way the browser does, close event included.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

const columns = ['Fecha y hora', 'Acción', 'Categoría', 'Responsable', 'Motivo'];

describe('audit of the tenant (spec 015, RN-IDA-PT-31 to -35 and -39)', () => {
  it('U·tenant_audit_asks_its_route_in_pages_of_20_and_shows_each_record: page 1, limit 20, no tenant in the request, one row per record', async () => {
    const { request, apiClient } = clientFor(pageOf(records));
    show(apiClient);

    const table = await screen.findByRole('table');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(PATH);
    expect(screen.getByRole('heading', { name: 'Auditoría del tenant', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Solo consulta')).toBeInTheDocument();
    expect(screen.getByText('Solo metadatos administrativos: nunca datos operativos ni sensibles de los clientes.')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(1 + records.length);
    expect(within(table).getAllByRole('button', { name: 'Detalle' })).toHaveLength(2);
  });

  it('U·tenant_audit_says_who_reads: the note of the Administrator, and the one of a role the Administrator enabled', async () => {
    show(clientFor(pageOf(records)).apiClient, true);
    expect(await screen.findByText('Eventos administrativos del tenant. Tú decides qué roles de consulta acceden a esta vista en Colaboradores.')).toBeInTheDocument();
  });

  it('U·tenant_audit_says_who_reads_a_reader_role: the note of the Manager and the Analyst', async () => {
    show(clientFor(pageOf(records)).apiClient, false);
    expect(await screen.findByText('Eventos relevantes del tenant. Acceso de solo consulta habilitado por el Administrador del tenant.')).toBeInTheDocument();
  });

  it('U·each_column_shows_the_field_it_comes_from_in_the_tenant_audit: the date, the action, its category, the actor and the reason, and no operator', async () => {
    show(clientFor(pageOf(records)).apiClient);

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([...columns, 'Detalle']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell').slice(0, 5).map((c) => c.textContent)).toEqual([
      '2026-11-06 14:32 UTC', 'Acceso a la auditoría habilitado', 'Usuarios internos', ACTOR, 'El contador revisa el cierre',
    ]);
    // an action the table does not know shows its code and "Otros"; nobody wrote a reason
    expect(within(rows[1]).getAllByRole('cell').slice(0, 5).map((c) => c.textContent)).toEqual([
      '2026-11-05 09:05 UTC', 'PAYMENT_VALIDATED', 'Otros', 'multi-tour-security', '—',
    ]);
  });

  it('U·tenant_detail_shows_the_extended_fields_of_the_record: the affected record, the value before and after, the channel and the reference', async () => {
    show(clientFor(pageOf(records)).apiClient);
    const trigger = (await screen.findAllByRole('button', { name: 'Detalle' }))[0];

    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    for (const label of ['Registro afectado', 'Valor anterior', 'Valor nuevo', 'Canal o módulo', 'Referencia funcional']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByText('roles/ACCOUNTANT')).toBeInTheDocument();
    expect(within(dialog).getByText('ADMIN_PORTAL')).toBeInTheDocument();
    expect(within(dialog).getByText('AUDIT_ACCESS')).toBeInTheDocument();
    expect(within(dialog).queryByText('Operador')).not.toBeInTheDocument();

    // the focus goes back to the button that opened the detail, by Close and by Escape alike (Escape is the `close` event of the dialog)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar detalle' }));
    expect(trigger).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.click(trigger);
    fireEvent(screen.getByRole('dialog', { name: 'Detalle de auditoría' }), new Event('close'));
    expect(trigger).toHaveFocus();
  });

  it('U·a_refused_role_sees_the_notice_and_no_table: a 403 of the service shows the notice, with no table and no retry', async () => {
    const { request, apiClient } = clientFor(refused());
    show(apiClient, false);

    expect(await screen.findByText('Tu rol no tiene acceso a la auditoría del tenant. Pide al Administrador del tenant que lo habilite en Colaboradores.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('U·a_failure_that_is_not_a_refusal_is_an_error_with_a_retry: a 500 or a 401 is never shown as a role without access', async () => {
    for (const status of [500, 401]) {
      const { apiClient } = clientFor(Object.assign(new Error('down'), { status }));
      const view = show(apiClient);
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
      expect(screen.queryByText(/Tu rol no tiene acceso/)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('U·tenant_audit_has_four_states: loading, error with a retry, empty and data', async () => {
    let release: (page: AuditPage) => void = () => {};
    const pending = new Promise<AuditPage>((resolve) => {
      release = resolve;
    });
    const { request, apiClient } = clientFor(pending, new Error('down'), pageOf(records));
    const view = show(apiClient);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    await act(async () => release(pageOf([])));
    expect(await screen.findByText('Aún no hay eventos de auditoría.')).toBeInTheDocument();
    view.unmount();

    const failing = show(apiClient);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(3);
    failing.unmount();
  });
});
