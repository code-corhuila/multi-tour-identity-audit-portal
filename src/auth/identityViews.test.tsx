import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewPasswordNotice } from './NewPasswordNotice';
import { RegisterScreen } from './RegisterScreen';

const apiClient = { request: vi.fn() };

// Spec 006 PT-03: the registration, recovery and new-password views carry the parts and texts of their Mockup files.
describe('calque of the Mockup: registration (RN-CAL-IDN-02)', () => {
  it('signup_renders_its_mockup_parts: two sections, the five requirements, the submit and the way back', () => {
    render(<RegisterScreen identifier="acme" apiClient={apiClient} onDone={vi.fn()} onSignIn={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Datos personales' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Seguridad' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Registrarse' })).toBeInTheDocument();
    expect(screen.getByText(/¿Ya tienes una cuenta\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inicia sesión' })).toBeInTheDocument();
  });

  it('signup_sections_group_the_right_fields: personal data before security', () => {
    render(<RegisterScreen identifier="acme" apiClient={apiClient} onDone={vi.fn()} onSignIn={vi.fn()} />);
    const personal = screen.getByRole('group', { name: 'Datos personales' });
    const security = screen.getByRole('group', { name: 'Seguridad' });
    for (const label of ['Nombre', 'Apellido', 'Correo electrónico', 'Número de teléfono']) {
      expect(personal).toContainElement(screen.getByLabelText(label));
    }
    for (const label of ['Contraseña', 'Confirmar contraseña']) {
      expect(security).toContainElement(screen.getByLabelText(label));
    }
  });
});

describe('calque of the Mockup: new password without a temporary credential (RN-CAL-IDN-02)', () => {
  it('new_password_renders_its_mockup_parts: two fields, the rule, the note and the save button; it sends nothing', () => {
    const onSignIn = vi.fn();
    render(<NewPasswordNotice identifier="acme" onSignIn={onSignIn} />);
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByText('Define una nueva contraseña para completar la recuperación de tu cuenta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByText('Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.')).toBeInTheDocument();
    expect(screen.getByText('El enlace o código vence en 30 minutos y solo puede usarse una vez.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Clave-Nueva-9aZ!x' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Clave-Nueva-9aZ!x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));
    expect(screen.getByText(/solo visual en esta versión/)).toBeInTheDocument();
    expect(apiClient.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('new_password_checks_that_both_fields_match: a mismatch shows its error and not the visual notice', () => {
    render(<NewPasswordNotice identifier="acme" onSignIn={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Clave-Nueva-9aZ!x' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'otra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.queryByText(/solo visual en esta versión/)).not.toBeInTheDocument();
  });
});
