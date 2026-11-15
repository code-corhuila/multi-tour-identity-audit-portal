import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
