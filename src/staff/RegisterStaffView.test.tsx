import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterStaffView } from './RegisterStaffView';

describe('register staff view (spec 009 PT-03, RN-CAL-USR-03 and -05)', () => {
  it('U·register_renders_its_mockup_parts: header, tenant box, the three sections, policy and actions', () => {
    render(<RegisterStaffView tenantName="Travesia Natural" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Registrar colaborador', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a colaboradores' })).toBeInTheDocument();
    expect(screen.getByText('Operador activo')).toBeInTheDocument();
    expect(screen.getByText('Travesia Natural')).toBeInTheDocument();
    for (const heading of ['Identidad y acceso', 'Rol asignado', 'Acceso inicial']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico / usuario de acceso')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña inicial')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe contener:')).toBeInTheDocument();
    expect(screen.getByText('Completa los datos del colaborador para registrarlo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar colaborador' })).toBeInTheDocument();
  });

  it('U·role_is_fixed_to_the_contract_value: the role is read only and no other can be chosen', () => {
    render(<RegisterStaffView tenantName="Travesia Natural" onBack={vi.fn()} />);
    const role = screen.getByLabelText('Rol') as HTMLInputElement;
    expect(role).toHaveAttribute('readonly');
    expect(role.value).toBe('Colaborador operativo');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('U·register_checks_the_fields_and_sends_nothing: an empty form names the missing fields; a valid one only says it is visual', () => {
    const onBack = vi.fn();
    render(<RegisterStaffView tenantName="Travesia Natural" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar colaborador' }));
    expect(screen.getAllByText('Este campo es obligatorio.').length).toBeGreaterThanOrEqual(2);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Camila Restrepo' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico / usuario de acceso'), { target: { value: 'camila@travesianatural.co' } });
    fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'Clave-Segura-9!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Clave-Segura-9!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar colaborador' }));
    expect(screen.getByText('Esta vista es solo visual en esta versión: el colaborador no se registra.')).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });
});
