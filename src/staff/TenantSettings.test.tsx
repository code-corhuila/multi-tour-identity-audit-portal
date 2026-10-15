import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffListView } from './StaffListView';

const show = () => render(<StaffListView source={async () => []} onRegister={vi.fn()} onOpen={vi.fn()} />);

describe('optional roles and regional settings (spec 009 PT-07, RN-CAL-USR-10, -11)', () => {
  it('U·optional_roles_toggle_each_one: Gerente, Contador and Analista have a checkbox and say the change is audited', () => {
    show();
    const panel = screen.getByRole('heading', { name: 'Roles opcionales del tenant' }).closest('section') as HTMLElement;
    for (const role of ['Gerente', 'Contador', 'Analista']) {
      expect(within(panel).getByRole('checkbox', { name: role })).not.toBeChecked();
    }
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Contador' }));
    expect(within(panel).getByRole('checkbox', { name: 'Contador' })).toBeChecked();
    expect(within(panel).getByRole('checkbox', { name: 'Gerente' })).not.toBeChecked();
    expect(within(panel).getByText('Contador habilitado para este tenant. Cambio auditado.')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Contador' }));
    expect(within(panel).getByText('Contador deshabilitado para este tenant. Cambio auditado.')).toBeInTheDocument();
  });

  it('U·regional_settings_show_audit_table: country and zone with a mandatory reason and the audit table', () => {
    show();
    const panel = screen.getByRole('heading', { name: 'País y zona horaria' }).closest('section') as HTMLElement;
    expect(within(panel).getByLabelText('País')).toHaveValue('CO');
    expect(within(panel).getByLabelText('Zona horaria oficial')).toHaveValue('America/Bogota');
    const audit = within(panel).getByRole('table', { name: 'Auditoría de país y zona horaria' });
    expect(within(audit).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha y hora', 'Campo', 'Anterior', 'Nuevo', 'Responsable', 'Motivo']);
    fireEvent.change(within(panel).getByLabelText('Zona horaria oficial'), { target: { value: 'America/Lima' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambio' }));
    expect(within(panel).getByText('Ingresa el motivo del cambio para la auditoría.')).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText('Motivo del cambio'), { target: { value: 'Nueva sede en Lima' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambio' }));
    const row = within(audit).getByText('Nueva sede en Lima').closest('tr') as HTMLElement;
    expect(within(row).getByText('Zona horaria')).toBeInTheDocument();
    expect(within(row).getByText('America/Bogota')).toBeInTheDocument();
    expect(within(row).getByText('America/Lima')).toBeInTheDocument();
  });
});
