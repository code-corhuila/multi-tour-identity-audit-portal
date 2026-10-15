import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StaffMember } from './staff';
import { StaffListView } from './StaffListView';

const members: StaffMember[] = [
  { id: 'c1', name: 'Camila Restrepo', email: 'camila@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-10T15:00:00Z' },
  { id: 'c2', name: 'Mateo Rojas', email: 'mateo@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-11T09:30:00Z' },
];

const show = (source: () => Promise<StaffMember[]>, handlers = { onRegister: vi.fn(), onOpen: vi.fn() }) =>
  render(<StaffListView source={source} {...handlers} />);

describe('staff list view (spec 009 PT-02, RN-CAL-USR-03)', () => {
  it('U·list_renders_its_mockup_parts: header, band, table columns and the permissions panel in order', async () => {
    show(async () => members);
    expect(screen.getByText('Gestión del equipo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Colaboradores', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar colaborador' })).toBeInTheDocument();
    expect(screen.getByText('Usuarios internos de tu operador.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Colaboradores registrados' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Nombre', 'Correo / usuario de acceso', 'Rol y permisos', 'Estado', 'Acción']);
    expect(within(table).getByText('camila@travesianatural.co')).toBeInTheDocument();
  });

  it('U·register_and_detail_hand_over: the header button and a row action call the container', async () => {
    const handlers = { onRegister: vi.fn(), onOpen: vi.fn() };
    show(async () => members, handlers);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar colaborador' }));
    expect(handlers.onRegister).toHaveBeenCalledTimes(1);
    const row = (await screen.findByText('Mateo Rojas')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Ver detalle' }));
    expect(handlers.onOpen).toHaveBeenCalledWith('c2');
  });


  it('U·list_has_four_states: loading, error with retry, empty and data', async () => {
    const source = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([]).mockResolvedValue(members);
    show(source);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no se han registrado colaboradores.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
