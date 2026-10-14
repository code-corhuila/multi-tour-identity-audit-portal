import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewPasswordNotice } from './NewPasswordNotice';
import { RecoverNotice } from './RecoverNotice';
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

describe('calque of the Mockup: recovery notice (RN-CAL-IDN-04)', () => {
  it('recover_view_is_only_a_notice_with_two_links: no field, no request, two ways out', () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    render(<RecoverNotice identifier="acme" onSignIn={onSignIn} onCreateAccount={onCreateAccount} />);
    expect(screen.getByRole('heading', { name: 'Recuperar acceso' })).toBeInTheDocument();
    expect(screen.getByText(/aún no está disponible en esta versión de Multi Tour/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(apiClient.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear una cuenta' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });
});

describe('calque of the Mockup: new password without a temporary credential (RN-CAL-IDN-02)', () => {
  it('new_password_renders_its_mockup_parts: the notice and the way back, no field', () => {
    const onSignIn = vi.fn();
    render(<NewPasswordNotice identifier="acme" onSignIn={onSignIn} />);
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByText(/no corresponde a un proceso activo/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(document.querySelector('input')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
