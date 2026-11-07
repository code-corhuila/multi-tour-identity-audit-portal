import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { AuditPage, AuditRecordResponse } from '../data/audit';
import { AuditView } from './AuditView';
import { PlatformFrame } from './PlatformFrame';

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

// The container's client, as the other views of the panel are tested: `request` answers by path.
function clientFor(...answers: Array<AuditPage | Promise<AuditPage> | Error>) {
  // a request the test did not plan fails with a clear message, not with a TypeError of `undefined.then`
  const request = vi.fn<(path: string) => Promise<AuditPage>>(async () => {
    throw new Error('a request that the test did not expect');
  });
  answers.forEach((a) => request.mockImplementationOnce(() => (a instanceof Error ? Promise.reject(a) : Promise.resolve(a))));
  return { request, apiClient: { request } as unknown as ApiClient };
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
});
