import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { OperatorsView } from './OperatorsView';
import { listClient, page, tenant } from './testkit';

const rows = [
  tenant({ tenantId: 't1', commercialName: 'Sierra Azul', identifier: 'sierra-azul', firstAdministratorMembershipId: 'm-1' }),
  tenant({ tenantId: 't2', commercialName: 'Costa Viva', identifier: 'costa-viva', tenantStatus: 'INACTIVE' }),
];
const show = (apiClient: ApiClient, props: { onCreate?: () => void; onOpen?: (id: string) => void } = {}) =>
  render(<OperatorsView apiClient={apiClient} onCreate={props.onCreate ?? vi.fn()} onOpen={props.onOpen ?? vi.fn()} />);

describe('OperatorsView (spec 007 PT-02, RN-CAL-PLT-04)', () => {
  it('U·operators_table_has_its_columns_and_pills', async () => {
    const onOpen = vi.fn();
    show(listClient(rows).apiClient, { onOpen });
    expect(screen.getByText('Gestión de operadores')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operadores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Empresas operadoras' })).toBeInTheDocument();
    await screen.findByText('Sierra Azul');
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Operador', 'Identificador', 'Primer administrador', 'Estado', 'Acciones']);
    expect(screen.getByText('Cada operador mantiene su información y operación aisladas dentro de Multitour.')).toBeInTheDocument();
    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('Creado: 2026-01-10')).toBeInTheDocument();
    expect(within(first).getByText('Activo')).toHaveClass('is-active');
    expect(within(second).getByText('Inactivo')).toHaveClass('is-inactive');
    expect(within(first).getByText('m-1')).toBeInTheDocument();
    expect(within(second).getByText('—')).toBeInTheDocument();
    fireEvent.click(within(second).getByRole('button', { name: 'Ver detalle' }));
    expect(onOpen).toHaveBeenCalledWith('t2');
  });

  it('U·create_is_a_header_button', async () => {
    const onCreate = vi.fn();
    show(listClient(rows).apiClient, { onCreate });
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    await screen.findByText('Sierra Azul');
  });

  it('U·next_page_asks_for_page_two', async () => {
    const request = vi.fn(async (path: string) =>
      /page=2/.test(path) ? page([rows[1]], { page: 2, totalPages: 2 }) : page([rows[0]], { totalPages: 2 }),
    );
    show({ request } as unknown as ApiClient);
    await screen.findByText('Sierra Azul');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Costa Viva')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('U·operators_has_four_states: loading, error with retry, empty and data', async () => {
    let fail = true;
    const request = vi.fn(async () => {
      if (fail) throw Object.assign(new Error('x'), { status: 503, traceId: 'trace-9' });
      return page([]);
    });
    show({ request } as unknown as ApiClient);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('trace-9');
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no hay operadores registrados.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
