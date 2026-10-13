import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { SummaryView } from './SummaryView';
import { listClient, tenant } from './testkit';

afterEach(() => vi.unstubAllEnvs());

const rows = [
  tenant({ tenantId: 't1', commercialName: 'Sierra Azul', identifier: 'sierra-azul' }),
  tenant({ tenantId: 't2', commercialName: 'Costa Viva', identifier: 'costa-viva', tenantStatus: 'INACTIVE' }),
];
const show = (apiClient: ApiClient, props: { onCreate?: () => void; onSeeAll?: () => void } = {}) =>
  render(<SummaryView apiClient={apiClient} onCreate={props.onCreate ?? vi.fn()} onSeeAll={props.onSeeAll ?? vi.fn()} />);

describe('SummaryView (spec 007 PT-02, RN-CAL-PLT-03)', () => {
  it('U·summary_shows_three_metrics_and_tenant_panel', async () => {
    show(listClient(rows).apiClient);
    expect(screen.getByRole('heading', { name: 'Operadores bajo control' })).toBeInTheDocument();
    expect(screen.getByText('Control de plataforma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear operador' })).toBeInTheDocument();
    expect(screen.getByText('Vista transversal')).toBeInTheDocument();
    const group = (name: string) => within(screen.getByRole('group', { name }));
    expect(await group('Operadores activos').findByText('2')).toBeInTheDocument();
    expect(group('Operadores inactivos').getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Altas este mes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estado de tenants' })).toBeInTheDocument();
    expect(screen.getByText('Operadores recientes')).toBeInTheDocument();
    expect(await screen.findByText('Sierra Azul')).toBeInTheDocument();
    expect(screen.getByText('Costa Viva')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('U·signups_is_a_dash_when_the_service_has_no_answer_and_the_stub_flag_is_off', async () => {
    show(listClient(rows).apiClient);
    await screen.findByText('Sierra Azul');
    expect(within(screen.getByRole('group', { name: 'Altas este mes' })).getByText('—')).toBeInTheDocument();
  });

  it('U·signups_shows_labelled_test_data_when_the_stub_flag_is_on', async () => {
    vi.stubEnv('VITE_STUB', 'true');
    show(listClient(rows).apiClient);
    const group = within(screen.getByRole('group', { name: 'Altas este mes' }));
    expect(await group.findByText('Datos de prueba')).toBeInTheDocument();
    expect(group.queryByText('—')).not.toBeInTheDocument();
  });

  it('U·create_and_see_all_hand_over_to_the_container', async () => {
    const onCreate = vi.fn();
    const onSeeAll = vi.fn();
    show(listClient(rows).apiClient, { onCreate, onSeeAll });
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
    await screen.findByText('Sierra Azul');
  });

  it('U·summary_has_four_states: loading, error with retry, empty and data', async () => {
    let fail = true;
    const request = vi.fn(async (path: string) => {
      if (fail) throw Object.assign(new Error('x'), { status: 503, traceId: 'trace-7' });
      const limit = Number(/limit=(\d+)/.exec(path)?.[1]);
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    });
    show({ request } as unknown as ApiClient);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Cargando…');
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('trace-7');
    fail = false;
    fireEvent.click(within(alerts[0]).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryAllByRole('alert').length).toBeLessThan(alerts.length));
    fireEvent.click(within(screen.getAllByRole('alert')[0]).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no hay operadores registrados.')).toBeInTheDocument();
  });
});
