import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import shellCss from './shell.css?raw';
import { show, unmountPortal } from './testkit';

afterEach(unmountPortal);

describe('sign-out from the access-mark screens', () => {
  it('Volver al inicio de sesión of the first password closes the session and shows the sign-in', async () => {
    const { session } = await show([], 'sierra-azul', 'password-change');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('Cerrar sesión of the restricted notice closes the session and shows the sign-in', async () => {
    const { session } = await show(['TENANT_ADMINISTRATOR'], 'sierra-azul', 'restricted');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });
});

describe('shell.css full-bleed', () => {
  it('the shell covers the whole viewport and centres the content block', () => {
    expect(shellCss).toMatch(/\.shell\s*{[^}]*min-height:\s*100vh/);
    expect(shellCss).toMatch(/\.shell\s*{[^}]*width:\s*100%/);
    expect(shellCss).toMatch(/\.shell \.operator-content\s*{[^}]*margin:\s*0 auto/);
    expect(shellCss).toMatch(/\.shell \.operator-content\s*{[^}]*background:\s*transparent/);
  });
});

describe('platform administrator shell', () => {
  it('shows the top bar with Resumen, Operadores and Crear operador, and no audit entry', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    const nav = screen.getByRole('navigation', { name: 'Navegación de plataforma' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Resumen', 'Operadores', 'Crear operador']);
    expect(screen.getByRole('banner')).toHaveTextContent('MULTITOUR');
    expect(screen.queryByText(/Auditor/)).not.toBeInTheDocument();
  });

  it('Resumen is the first page: operators under control with total, active and inactive counts', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    expect(await screen.findByRole('heading', { name: 'Operadores bajo control' })).toBeInTheDocument();
    expect(await within(await screen.findByRole('group', { name: 'Total de operadores' })).findByText('3')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Operadores activos' })).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Operadores inactivos' })).getByText('1')).toBeInTheDocument();
  });

  it('Operadores shows the list and Crear operador shows the register form', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Operadores' }));
    expect(await screen.findByText('Sierra Azul')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador' }));
    expect(screen.getByLabelText('Identificador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear operador' })).toHaveAttribute('aria-current', 'page');
  });

  it('Cerrar sesión closes the session and goes back to the platform sign-in', async () => {
    const { session } = await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Acceso de plataforma' })).toBeInTheDocument();
  });
});

