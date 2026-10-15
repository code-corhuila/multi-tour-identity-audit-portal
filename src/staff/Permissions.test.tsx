import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffMember } from './staff';
import { StaffDetailView } from './StaffDetailView';
import { StaffListView } from './StaffListView';
import { resetAssignedPermissions } from './PermissionsPanel';

const member = (role: string): StaffMember => ({ id: 'c1', name: 'Camila Restrepo', email: 'camila@travesianatural.co', role, tenant: 'Travesia Natural', createdAt: '2026-10-10T15:00:00Z' });
const detail = (role: string) => render(<StaffDetailView id="c1" source={async () => [member(role)]} onBack={vi.fn()} />);
const row = (name: string) => within(screen.getByRole('table', { name: 'Permisos' })).getByText(name).closest('tr') as HTMLElement;

describe('special permissions per user (spec 009 PT-06, RN-CAL-USR-08, -09, -12)', () => {
  beforeEach(resetAssignedPermissions);

  it('U·detail_assigns_and_withdraws_permissions: assign and withdraw one permission, with reason and audit row', async () => {
    detail('Colaborador operativo');
    await screen.findByRole('heading', { name: 'Permisos de este usuario' });
    expect(within(row('Validar comprobantes')).getByText('No asignado')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Motivo de la asignación o retiro/), { target: { value: 'Turno de caja' } });
    fireEvent.click(within(row('Validar comprobantes')).getByRole('button', { name: 'Asignar' }));
    expect(within(row('Validar comprobantes')).getByText('Asignado')).toBeInTheDocument();
    const audit = screen.getByRole('table', { name: 'Auditoría de permisos' });
    expect(within(audit).getByText('Turno de caja')).toBeInTheDocument();
    fireEvent.click(within(row('Validar comprobantes')).getByRole('button', { name: 'Retirar' }));
    expect(within(row('Validar comprobantes')).getByText('No asignado')).toBeInTheDocument();
    expect(within(audit).getAllByRole('row')).toHaveLength(3);
  });

  it('U·query_only_roles_cannot_receive_permissions: Gerente gets no button and says why', async () => {
    detail('Gerente');
    await screen.findByRole('heading', { name: 'Permisos de este usuario' });
    expect(screen.getByText(/es de solo consulta y no puede recibir permisos especiales/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Asignar' })).not.toBeInTheDocument();
    expect(within(row('Gestionar caja')).getByText('No aplica al rol')).toBeInTheDocument();
  });

  it('U·administrator_has_three_permissions_by_profile: only the sensitive one is assignable', async () => {
    detail('Administrador del tenant');
    await screen.findByRole('heading', { name: 'Permisos de este usuario' });
    expect(within(row('Gestionar caja')).getByText('Por perfil')).toBeInTheDocument();
    expect(within(row('Consultar datos sensibles')).getByRole('button', { name: 'Asignar' })).toBeInTheDocument();
  });

  it('U·global_transfer_box_is_gone: the list no longer has the global switch', async () => {
    render(<StaffListView source={async () => [member('Colaborador operativo')]} onRegister={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByRole('table');
    expect(screen.queryByRole('heading', { name: 'Validación de soportes de transferencia' })).not.toBeInTheDocument();
    expect(screen.getByText(/Permisos especiales por usuario/)).toBeInTheDocument();
  });

  it('U·assignments_survive_leaving_and_reopening_the_detail: the demo goes list, detail, back and detail again', async () => {
    const first = detail('Colaborador operativo');
    await screen.findByRole('heading', { name: 'Permisos de este usuario' });
    fireEvent.click(within(row('Gestionar caja')).getByRole('button', { name: 'Asignar' }));
    expect(within(row('Gestionar caja')).getByText('Asignado')).toBeInTheDocument();
    first.unmount();
    detail('Colaborador operativo');
    await screen.findByRole('heading', { name: 'Permisos de este usuario' });
    expect(within(row('Gestionar caja')).getByText('Asignado')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Auditoría de permisos' })).getAllByRole('row')).toHaveLength(2);
  });
});
