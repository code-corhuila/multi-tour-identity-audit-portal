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

describe('platform administrator shell (spec 007: the Mockup panel, wired)', () => {
  it('shows the left sidebar with Resumen, Operadores and Auditoría, and Crear operador as a header button', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    const nav = screen.getByRole('navigation', { name: 'Navegación de plataforma' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Resumen', 'Operadores', 'Auditoría']);
    expect(within(nav).queryByText('Crear operador')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear operador' })).toBeInTheDocument();
  });

  it('Resumen is the first page with the three metrics of the Mockup', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    expect(await screen.findByRole('heading', { name: 'Operadores bajo control' })).toBeInTheDocument();
    expect(await screen.findByText('Operadores activos')).toBeInTheDocument();
    expect(screen.getByText('Operadores inactivos')).toBeInTheDocument();
  });

  it('Operadores shows the directory and the header button opens the create form', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Operadores' }));
    expect(await screen.findByText('Sierra Azul')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Operadores' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Crear operador' }));
    expect(await screen.findByText('Alta administrativa')).toBeInTheDocument();
  });

  it('Ver detalle leaves the directory for the operator detail', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Operadores' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    expect(screen.queryByText('Empresas operadoras')).not.toBeInTheDocument();
  });

  it('Auditoría shows the audit view', async () => {
    await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByRole('heading', { name: 'Auditoría de plataforma' })).toBeInTheDocument();
  });

  it('Cerrar sesión closes the session and goes back to the platform sign-in', async () => {
    const { session } = await show(['PLATFORM_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Acceso de plataforma' })).toBeInTheDocument();
  });
});
