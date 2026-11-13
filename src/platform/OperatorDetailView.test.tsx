import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { OperatorDetailView } from './OperatorDetailView';

const ID = '550e8400-e29b-41d4-a716-446655440001';
const activeTenant = {
  tenantId: ID,
  identifier: 'sierra-azul',
  commercialName: 'Sierra Azul',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  firstAdministratorMembershipId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  createdAt: '2026-10-11T10:00:00Z',
};
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });

function setup(request: ApiClient['request']) {
  const onBack = vi.fn();
  render(<OperatorDetailView apiClient={{ request }} tenantId={ID} onBack={onBack} />);
  return { onBack };
}

describe('operator detail view (RN-CAL-PLT-06)', () => {
  it('U·detail_has_band_state_and_scope_panels: the header, the dark band, the state panel and the scope panel', async () => {
    const { onBack } = setup(vi.fn().mockResolvedValue(activeTenant));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sierra Azul' })).toBeInTheDocument();
    expect(screen.getByText('Detalle del operador')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a operadores' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    const band = screen.getByLabelText('Resumen del operador');
    expect(within(band).getByText('Activo')).toBeInTheDocument();
    expect(within(band).getByText('Identificador: sierra-azul')).toBeInTheDocument();
    expect(within(band).getByText('Primer Administrador')).toBeInTheDocument();
    expect(within(band).getByText('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBeInTheDocument();

    const state = screen.getByLabelText('Estado operativo');
    expect(within(state).getByRole('heading', { name: 'Operador activo' })).toBeInTheDocument();
    expect(within(state).getByLabelText('Motivo de la inactivación')).toBeInTheDocument();
    expect(within(state).getByRole('button', { name: 'Inactivar operador' })).toBeEnabled();

    const scope = screen.getByLabelText('Alcance del Administrador de plataforma');
    expect(within(scope).getAllByRole('listitem')).toHaveLength(3);
  });

  it('U·detail_without_a_first_administrator_says_so: the band shows the unassigned text', async () => {
    setup(vi.fn().mockResolvedValue({ ...activeTenant, firstAdministratorMembershipId: null }));
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
  });

  it('U·detail_has_four_states: loading, error with retry and data', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(500, { traceId: 't-1' })).mockResolvedValue(activeTenant);
    setup(request);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(await screen.findByRole('alert')).toHaveTextContent('t-1');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Sierra Azul' })).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('U·detail_not_found_says_so: a 404 shows the not-found line', async () => {
    setup(vi.fn().mockRejectedValue(failure(404)));
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos este operador.');
  });

  // RN-IDA-PT-05: a reason is required and the change asks for confirmation before anything is sent.
  it('U·status_change_requires_a_reason: an empty reason shows its error and nothing is posted', async () => {
    const request = vi.fn().mockResolvedValue(activeTenant);
    setup(request);
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar operador' }));
    expect(screen.getByText('Ingresa el motivo de la inactivación.')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('U·status_change_asks_for_confirmation: a valid reason opens the dialog and sends nothing yet', async () => {
    const request = vi.fn().mockResolvedValue(activeTenant);
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  // RN-IDA-PT-10: the Mockup flow — the action by status, the confirmation names the tenant and lists what
  // the change does, and cancelling sends nothing.
  it('U·active_tenant_offers_inactivate_and_inactive_offers_reactivate: the button and the reason label follow the status', async () => {
    setup(vi.fn().mockResolvedValue(activeTenant));
    const state = await screen.findByLabelText('Estado operativo');
    expect(within(state).getByRole('button', { name: 'Inactivar operador' })).toBeInTheDocument();
    expect(within(state).getByLabelText('Motivo de la inactivación')).toBeInTheDocument();

    setup(vi.fn().mockResolvedValue({ ...activeTenant, tenantStatus: 'INACTIVE', statusReason: 'Contrato vencido' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Reactivar operador' }).length).toBeGreaterThan(0));
    expect(screen.getAllByLabelText('Motivo de la reactivación').length).toBeGreaterThan(0);
  });

  it('U·confirmation_names_the_tenant_and_lists_the_consequences: the dialog names the tenant and lists what happens', async () => {
    setup(vi.fn().mockResolvedValue(activeTenant));
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Inactivar a Sierra Azul?')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button', { name: /Confirmar inactivación/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('U·cancel_sends_nothing: cancelling the dialog closes it and posts nothing', async () => {
    const request = vi.fn().mockResolvedValue(activeTenant);
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  // RN-IDA-PT-11: confirming sends the change once and the answer decides what the screen shows next.
  it('U·confirmed_change_is_sent_once_and_shows_the_new_status: posts the reason once and shows who, when and why', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(activeTenant)
      .mockResolvedValueOnce({
        ...activeTenant,
        tenantStatus: 'INACTIVE',
        statusReason: 'Contrato vencido',
        statusChangedBy: 'ana@example.com',
        statusChangedAt: '2026-10-23T15:00:00Z',
      });
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    const confirm = await screen.findByRole('button', { name: /Confirmar inactivación/ });
    fireEvent.click(confirm);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(`/api/v1/identity-audit/tenants/${ID}/inactivate`, {
      method: 'POST',
      body: { reason: 'Contrato vencido' },
      signal: undefined,
    });
    expect(await screen.findByRole('heading', { name: 'Operador inactivo' })).toBeInTheDocument();
    expect(screen.getByText('Contrato vencido')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('U·confirmed_change_disables_the_button_while_it_travels: the confirm button is disabled until the answer arrives', async () => {
    let resolvePost: (value: typeof activeTenant & { statusReason?: string }) => void = () => {};
    const request = vi.fn().mockImplementationOnce(() => Promise.resolve(activeTenant)).mockImplementationOnce(
      () => new Promise((resolve) => { resolvePost = resolve as typeof resolvePost; }),
    );
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    const confirm = await screen.findByRole('button', { name: /Confirmar inactivación/ });
    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    resolvePost({ ...activeTenant, tenantStatus: 'INACTIVE', statusReason: 'Contrato vencido' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('U·status_already_changed_offers_reload: a 422 offers to reload instead of the common message', async () => {
    const request = vi.fn().mockResolvedValueOnce(activeTenant).mockRejectedValueOnce(failure(422, { code: 'INVALID_STATUS_TRANSITION' }));
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar inactivación/ }));
    expect(await screen.findByText('El estado del operador ya cambió.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('U·other_refusal_keeps_the_reason_and_shows_the_trace_id: any other refusal shows the common message and the reason stays', async () => {
    const request = vi.fn().mockResolvedValueOnce(activeTenant).mockRejectedValueOnce(failure(500, { traceId: 't-2' }));
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar inactivación/ }));
    expect(await screen.findByText('t-2', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo de la inactivación')).toHaveValue('Contrato vencido');
  });

  // RN-IDA-PT-06 / RN-IDA-PT-11: the who/when/why trail, and no action outside the two statuses that allow one.
  it('U·tenant_shows_who_when_why: an inactive tenant shows who, when and the reason', async () => {
    setup(
      vi.fn().mockResolvedValue({
        ...activeTenant,
        tenantStatus: 'INACTIVE',
        statusReason: 'Contrato vencido',
        statusChangedBy: 'ana@example.com',
        statusChangedAt: '2026-10-20T08:00:00Z',
      }),
    );
    expect(await screen.findByText('Contrato vencido')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com', { exact: false })).toBeInTheDocument();
  });

  it('U·pending_or_failed_tenant_offers_no_action: a pending tenant shows no form and no status-change button', async () => {
    setup(vi.fn().mockResolvedValue({ ...activeTenant, tenantStatus: 'PENDING', statusReason: null }));
    await screen.findByRole('heading', { name: 'Alta en proceso' });
    expect(screen.queryByRole('button', { name: /Inactivar|Reactivar/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Motivo de la/)).not.toBeInTheDocument();
  });
});
