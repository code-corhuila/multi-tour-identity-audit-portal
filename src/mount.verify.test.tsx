import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './contract';
import { mount } from './mount';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

async function show() {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  const request = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier: 'acme', commercialName: 'Acme Tours' });
  });
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function register() {
  fireEvent.click(screen.getByText('Crear cuenta'));
  type('Nombre', 'Laura');
  type('Apellido', 'Pérez');
  type('Correo electrónico', 'laura@example.com');
  type('Número de teléfono', '3001234567');
  type('Contraseña', 'Viaje-2026!');
  type('Confirmar contraseña', 'Viaje-2026!');
  fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
}

describe('registering ends in the notice to check the e-mail', () => {
  it('created_account_shows_check_your_email: names the company and the e-mail typed, never "Cuenta creada. Inicia sesión."', async () => {
    await show();
    register();
    expect(await screen.findByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.getByText('Acme Tours')).toBeInTheDocument();
    expect(screen.getByText('laura@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Cuenta creada. Inicia sesión.')).not.toBeInTheDocument();
  });

  it('the notice leads to sign-in without the old notice', async () => {
    await show();
    register();
    fireEvent.click(await screen.findByRole('button', { name: 'Ir a iniciar sesión' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument());
    expect(screen.queryByText('Cuenta creada. Inicia sesión.')).not.toBeInTheDocument();
  });
});
