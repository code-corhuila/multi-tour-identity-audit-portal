import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { AuditPage, AuditRecordResponse } from '../data/audit';
import type { TenantPage } from '../data/tenants';
import { AuditView } from './AuditView';
import { PlatformFrame } from './PlatformFrame';
import { page as tenantsPage, tenant } from './testkit';

const TENANT = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e4f0a11';
const OTHER = '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a';
const ACTOR = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const PATH = '/api/v1/identity-audit/audit-records?page=1&limit=20';

const inactivated: AuditRecordResponse = {
  auditRecordId: '00000000-0000-4000-8000-000000000001',
  tenantId: TENANT,
  actorId: ACTOR,
  action: 'TENANT_INACTIVATED',
  affectedRecordId: `tenants/${TENANT}`,
  reason: 'Solicitud del operador',
  previousValue: { tenantStatus: 'ACTIVE' },
  newValue: { tenantStatus: 'INACTIVE' },
  channelOrModule: 'ADMIN_PORTAL',
  functionalProcessReference: 'TENANT_LIFECYCLE',
  recordedAt: '2026-11-06T14:32:00Z',
};
const blocked: AuditRecordResponse = {
  auditRecordId: '00000000-0000-4000-8000-000000000002',
  tenantId: null,
  actorId: 'multi-tour-security',
  action: 'ACCOUNT_BLOCKED',
  affectedRecordId: `accounts/${OTHER}`,
  recordedAt: '2026-11-05T09:05:00Z',
};
const records = [inactivated, blocked];

const pageOf = (data: AuditRecordResponse[]): AuditPage => ({ data, meta: { page: 1, limit: 20, total: data.length, totalPages: data.length ? 1 : 0 } });

// The container's client, as the other views of the panel are tested: `request` answers by path. The audit route takes
// the answers in order; the list of tenants (the names of the operators) answers an empty page unless a test changes it.
function clientFor(...answers: Array<AuditPage | Promise<AuditPage> | Error>) {
  // a request the test did not plan fails with a clear message, not with a TypeError of `undefined.then`
  const request = vi.fn<(path: string) => Promise<AuditPage>>(async () => {
    throw new Error('a request that the test did not expect');
  });
  answers.forEach((a) => request.mockImplementationOnce(() => (a instanceof Error ? Promise.reject(a) : Promise.resolve(a))));
  const tenants = vi.fn<(path: string) => Promise<TenantPage>>(async () => tenantsPage([]));
  const routed = vi.fn((path: string) => (path.startsWith('/api/v1/identity-audit/tenants') ? tenants(path) : request(path)));
  return { request, tenants, apiClient: { request: routed } as unknown as ApiClient };
}

function show(apiClient: ApiClient) {
  return render(
    <PlatformFrame current="audit" onNavigate={() => {}} onSignOut={() => {}}>
      <AuditView apiClient={apiClient} />
    </PlatformFrame>,
  );
}

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

const columns = ['Fecha y hora', 'Acción', 'Operador', 'Cambio', 'Responsable', 'Motivo'];
const detailLabels = [...columns, 'Registro afectado', 'Valor anterior', 'Valor nuevo', 'Canal o módulo', 'Referencia funcional'];

describe('platform audit view on the real records (spec 014, RN-IDA-PT-19 to -28)', () => {
  it('U·audit_view_shows_the_records_the_service_gives_in_pages_of_20: asks page 1 with a limit of 20 and shows every record, in order', async () => {
    const { request, apiClient } = clientFor(pageOf(records));
    show(apiClient);

    const table = await screen.findByRole('table');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(PATH);
    expect(screen.getByRole('heading', { name: 'Auditoría de plataforma', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auditoría' })).toHaveAttribute('aria-current', 'page');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([...columns, 'Detalle']);
    expect(within(table).getAllByRole('row')).toHaveLength(1 + records.length);
    expect(within(table).getAllByRole('button', { name: 'Detalle' })).toHaveLength(2);
    expect(screen.queryByText('Datos de prueba')).not.toBeInTheDocument();
  });

  it('U·each_column_shows_the_field_it_comes_from: the date, the action, the operator, the change, the actor and the reason of each record', async () => {
    show(clientFor(pageOf(records)).apiClient);

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell').slice(0, 6).map((c) => c.textContent)).toEqual([
      '2026-11-06 14:32 UTC', 'Operador inactivado', TENANT, 'Activo → Inactivo', ACTOR, 'Solicitud del operador',
    ]);
    // a record of the platform's own: no tenant, nobody wrote a reason, nothing changed state
    expect(within(rows[1]).getAllByRole('cell').slice(0, 6).map((c) => c.textContent)).toEqual([
      '2026-11-05 09:05 UTC', 'Cuenta bloqueada', 'Plataforma', '—', 'multi-tour-security', '—',
    ]);
  });

  it('U·detail_opens_the_dialog_with_the_event: the dialog shows the record of the row that was clicked', async () => {
    show(clientFor(pageOf(records)).apiClient);
    const buttons = await screen.findAllByRole('button', { name: 'Detalle' });

    fireEvent.click(buttons[1]);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    expect(within(dialog).getByText('Evento auditado')).toBeInTheDocument();
    expect(within(dialog).getByText('Cuenta bloqueada')).toBeInTheDocument();
    expect(within(dialog).getByText('Plataforma')).toBeInTheDocument();
  });

  it('U·detail_shows_the_extended_fields_of_the_record: the affected record, the value before and after, the channel and the reference, and nothing operational', async () => {
    show(clientFor(pageOf(records)).apiClient);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Detalle' }))[0]);

    const dialog = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    expect(within(dialog).getAllByRole('term').map((t) => t.textContent)).toEqual(detailLabels);
    expect(within(dialog).getAllByRole('definition')).toHaveLength(detailLabels.length);
    expect(within(dialog).getByText(`tenants/${TENANT}`)).toBeInTheDocument();
    expect(within(dialog).getByText('ADMIN_PORTAL')).toBeInTheDocument();
    expect(within(dialog).getByText('TENANT_LIFECYCLE')).toBeInTheDocument();
    const printed = Array.from(dialog.querySelectorAll('pre')).map((p) => JSON.parse(p.textContent ?? ''));
    expect(printed).toEqual([{ tenantStatus: 'ACTIVE' }, { tenantStatus: 'INACTIVE' }]);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' })));

    // a record that holds none of the extended part shows a dash in each of them
    fireEvent.click(screen.getAllByRole('button', { name: 'Detalle' })[1]);
    const second = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    const values = within(second).getAllByRole('definition').map((d) => d.textContent);
    expect(values.slice(6)).toEqual([`accounts/${OTHER}`, '—', '—', '—', '—']);
    expect(second.querySelectorAll('pre')).toHaveLength(0);
  });

  it('U·close_and_escape_return_focus: "Cerrar" and the close event of Escape give the focus back to the row button', async () => {
    show(clientFor(pageOf(records)).apiClient);
    const buttons = await screen.findAllByRole('button', { name: 'Detalle' });
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toHaveFocus();

    fireEvent.click(buttons[1]);
    // Escape makes the browser close the dialog itself and fire `close`.
    fireEvent(screen.getByRole('dialog', { name: 'Detalle de auditoría' }), new Event('close'));
    expect(buttons[1]).toHaveFocus();
  });

  it('U·audit_has_four_states: loading, error with a retry, empty and data', async () => {
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

  it('U·operator_names_are_read_once_and_a_failed_read_does_not_hide_the_table: the commercial name when the tenant is known, its identifier when not', async () => {
    const reactivated: AuditRecordResponse = { ...inactivated, auditRecordId: '00000000-0000-4000-8000-000000000003', tenantId: OTHER, action: 'TENANT_REACTIVATED' };
    const { request, tenants, apiClient } = clientFor(new Error('down'), pageOf([inactivated, reactivated]));
    tenants.mockResolvedValue(tenantsPage([tenant({ tenantId: TENANT, commercialName: 'Sierra Azul' })]));
    show(apiClient);

    // the audit fails first and is asked again: the names are not read again with it
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(await within(rows[0]).findByText('Sierra Azul')).toBeInTheDocument();
    expect(within(rows[1]).getAllByRole('cell')[2]).toHaveTextContent(OTHER);
    expect(request).toHaveBeenCalledTimes(2);
    expect(tenants).toHaveBeenCalledTimes(1);
    expect(tenants).toHaveBeenCalledWith('/api/v1/identity-audit/tenants?page=1&limit=100');
  });

  it('U·pager_moves_between_pages_and_disables_at_the_ends: previous and next ask the neighbour page and are disabled where they do not apply', async () => {
    const twoPages = (page: number, data: AuditRecordResponse[]): AuditPage => ({ data, meta: { page, limit: 20, total: 21, totalPages: 2 } });
    const { request, apiClient } = clientFor(twoPages(1, [inactivated]), twoPages(2, [blocked]), twoPages(1, [inactivated]));
    show(apiClient);

    const pager = await screen.findByRole('navigation', { name: 'Paginación' });
    expect(within(pager).getByText('Página 1 de 2')).toBeInTheDocument();
    expect(within(pager).getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(within(pager).getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
    expect(request.mock.calls[1][0]).toBe('/api/v1/identity-audit/audit-records?page=2&limit=20');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(within(screen.getByRole('table')).getByText('Cuenta bloqueada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument();
    expect(request.mock.calls[2][0]).toBe(PATH);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('U·no_pager_when_there_is_nothing_to_page: an empty audit shows the empty text and no navigation', async () => {
    show(clientFor(pageOf([])).apiClient);

    expect(await screen.findByText('Aún no hay eventos de auditoría.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('U·names_that_arrive_after_the_table_replace_the_identifiers', async () => {
    let release: (page: TenantPage) => void = () => {};
    const { tenants, apiClient } = clientFor(pageOf(records));
    tenants.mockReturnValue(new Promise<TenantPage>((resolve) => (release = resolve)));
    show(apiClient);

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent(TENANT);
    await act(async () => release(tenantsPage([tenant({ tenantId: TENANT, commercialName: 'Sierra Azul' })])));
    expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent('Sierra Azul');
  });

  it('U·a_failed_read_of_the_names_leaves_the_identifiers_and_no_error: the table still shows', async () => {
    const { tenants, apiClient } = clientFor(pageOf(records));
    tenants.mockRejectedValue(new Error('down'));
    show(apiClient);

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent(TENANT);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
