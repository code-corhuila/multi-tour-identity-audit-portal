import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { OperatorDetailView } from './OperatorDetailView';

const ID = '550e8400-e29b-41d4-a716-446655440001';
const tenant = {
  tenantId: ID,
  identifier: 'sierra-azul',
  commercialName: 'Sierra Azul',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  firstAdministratorMembershipId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  createdAt: '2026-10-11T10:00:00Z',
};
const GET = `/api/v1/identity-audit/tenants/${ID}`;
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });

function setup(request: ApiClient['request']) {
  const onBack = vi.fn();
  render(<OperatorDetailView apiClient={{ request }} tenantId={ID} onBack={onBack} />);
  return { onBack };
}
// The read answers the active tenant; the inactivation answers the tenant already inactive.
const answering = () =>
  vi.fn((_path: string, init?: { method?: string }) =>
    Promise.resolve(init?.method === 'POST' ? { ...tenant, tenantStatus: 'INACTIVE', statusReason: 'Contrato vencido' } : tenant),
  ) as unknown as ApiClient['request'] & ReturnType<typeof vi.fn>;

describe('operator detail view (RN-CAL-PLT-06)', () => {
  it('U·detail_has_band_state_and_scope_panels: the header, the dark band, the state panel and the scope panel', async () => {
    const { onBack } = setup(answering());
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
    setup(vi.fn().mockResolvedValue({ ...tenant, firstAdministratorMembershipId: null }));
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
  });

  it('U·inactivation_requires_a_reason: an empty reason shows its error and nothing is posted', async () => {
    const request = answering();
    setup(request);
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar operador' }));
    expect(screen.getByText('Ingresa el motivo de la inactivación.')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('U·inactivation_posts_the_reason_and_shows_the_inactive_state: one POST, then the inactive panel without the form', async () => {
    const request = answering();
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Contrato vencido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    expect(await screen.findByRole('heading', { name: 'Operador inactivo' })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(`${GET}/inactivate`, expect.objectContaining({ method: 'POST', body: { reason: 'Contrato vencido' } }));
    expect(screen.getByText('Contrato vencido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inactivar operador' })).not.toBeInTheDocument();
  });

  it('U·inactivation_refused_shows_the_line: a 422 says the operator is no longer active', async () => {
    const request = vi.fn((_path: string, init?: { method?: string }) =>
      init?.method === 'POST' ? Promise.reject(failure(422)) : Promise.resolve(tenant),
    ) as unknown as ApiClient['request'];
    setup(request);
    fireEvent.change(await screen.findByLabelText('Motivo de la inactivación'), { target: { value: 'Motivo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar operador' }));
    expect(await screen.findByText('El operador ya no está activo.')).toBeInTheDocument();
  });

  it('U·detail_has_four_states: loading, error with retry and data', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(500, { traceId: 't-1' })).mockResolvedValue(tenant);
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
});
