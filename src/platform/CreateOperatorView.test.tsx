import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { CreateOperatorView } from './CreateOperatorView';

const saga = {
  id: '0b6f4a1e-3c1d-4e0a-9d52-1f3f6f0c9a11',
  status: 'COMPLETED',
  completedSteps: ['CREATE_TENANT', 'CREATE_ACCOUNT', 'APPLY_STATUS'],
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  createdAt: '2026-10-11T10:00:00Z',
  updatedAt: '2026-10-11T10:00:01Z',
};

function setup(request: ApiClient['request'] = vi.fn()) {
  const onBack = vi.fn();
  render(<CreateOperatorView apiClient={{ request }} onBack={onBack} pollMs={0} />);
  return { onBack, request };
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('create operator view (RN-CAL-PLT-05)', () => {
  it('U·create_form_has_both_sections: the header, the two numbered sections, every field and the five requirements', () => {
    const { onBack } = setup();
    expect(screen.getByText('Alta administrativa')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Crear operador' })).toBeInTheDocument();
    expect(screen.getByText('01. Identidad del operador')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Datos del operador' })).toBeInTheDocument();
    expect(screen.getByText('02. Responsable inicial')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Primer Administrador' })).toBeInTheDocument();
    for (const label of ['Nombre comercial', 'Identificador único', 'Estado inicial', 'Zona horaria', 'País', 'Nombre completo', 'Correo electrónico', 'Contraseña inicial', 'Confirmar contraseña']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    const policy = screen.getByLabelText('Requisitos de la contraseña');
    expect(within(policy).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Crear operador y asignar Administrador' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('U·create_validates_before_sending: empty fields show their errors and nothing is sent', () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador y asignar Administrador' }));
    expect(screen.getByText('Ingresa el identificador.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa el nombre comercial.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('U·create_sends_the_registration_and_shows_the_result: one start with the form data, then the done notice', async () => {
    const request = vi.fn().mockResolvedValue(saga);
    setup(request);
    type('Identificador único', 'sierra-azul');
    type('Nombre comercial', 'Sierra Azul');
    type('Nombre completo', 'Ana Gómez');
    type('Correo electrónico', 'ana@sierra.co');
    type('Contraseña inicial', 'Viaje-2026!');
    type('Confirmar contraseña', 'Viaje-2026!');
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador y asignar Administrador' }));
    await waitFor(() => expect(screen.getByText('El operador fue registrado.')).toBeInTheDocument());
    expect(request).toHaveBeenCalledWith(
      '/api/v1/sagas/onboard-tenant',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ identifier: 'sierra-azul', commercialName: 'Sierra Azul', administrator: { fullName: 'Ana Gómez', email: 'ana@sierra.co', password: 'Viaje-2026!' } }),
      }),
    );
  });
});
