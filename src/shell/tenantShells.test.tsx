import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { show, unmountPortal } from './testkit';

afterEach(unmountPortal);

describe('tenant staff shell', () => {
  it.each(['TENANT_ADMINISTRATOR', 'OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'])(
    '%s sees Control de la operación instead of the sign-in',
    async (role) => {
      await show([role], 'sierra-azul');
      expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
      expect(screen.getByText('sierra-azul')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Bienvenido de nuevo' })).not.toBeInTheDocument();
    },
  );

  it('Catálogos, Descuentos and the card link to the commercial area; the other areas are disabled as Próximamente', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    const area = '/t/sierra-azul/areas/commercial-reservation-portal';
    expect(screen.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('href', area);
    expect(screen.getByRole('link', { name: 'Descuentos' })).toHaveAttribute('href', area);
    expect(screen.getByRole('link', { name: /Descuentos y condiciones/ })).toHaveAttribute('href', area);
    for (const name of ['Reservas y clientes', 'Pagos y devoluciones', 'Ejecución y costos']) {
      const card = screen.getByRole('group', { name });
      expect(card).toHaveAttribute('aria-disabled', 'true');
      expect(within(card).getByText('Próximamente')).toBeInTheDocument();
      expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    }
  });

  it('a role that is neither staff nor customer sees the sign-in, never the home', async () => {
    await show(['SOMETHING_ELSE'], 'sierra-azul');
    expect(screen.queryByRole('heading', { name: 'Control de la operación' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('Cerrar sesión closes the session and returns to the company sign-in', async () => {
    const { session } = await show(['MANAGER'], 'sierra-azul');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });
});

describe('final customer panel', () => {
  it('greets, links Mis reservas to the commercial area and opens Mi perfil', async () => {
    await show(['FINAL_CUSTOMER'], 'sierra-azul');
    expect(screen.getByRole('heading', { level: 1, name: /Hola/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mis reservas/ })).toHaveAttribute('href', '/t/sierra-azul/areas/commercial-reservation-portal');
    expect(screen.getByRole('button', { name: /Mi perfil/ })).toBeEnabled();
  });

  it('Cerrar sesión returns to the company sign-in', async () => {
    const { session } = await show(['FINAL_CUSTOMER'], 'sierra-azul');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });
});

describe('the access marks still win over the role', () => {
  it('a temporary credential goes to the first password even with a staff role', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul', 'password-change');
    expect(screen.getByRole('heading', { name: 'Definir nueva contraseña' })).toBeInTheDocument();
  });

  it('a restricted access shows only the notice even with a staff role', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul', 'restricted');
    expect(screen.getByText(/La empresa está inactiva/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Control de la operación' })).not.toBeInTheDocument();
  });
});
