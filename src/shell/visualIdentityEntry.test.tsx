import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MountProps } from '../contract';
import { mount } from '../mount';
import { containerSession } from './testkit';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

// Answer copied from the contract example of `setTenantVisualIdentity`.
const tenant = { tenantId: 't1', identifier: 'sierra-azul', commercialName: 'Sierra Azul', tenantStatus: 'ACTIVE', timeZone: 'America/Bogota', country: 'CO', visualIdentity: { primaryColor: '#146B5D', secondaryColor: '#0F564B' }, createdAt: '2026-01-10T08:00:00Z' };

async function show(role: string, extra: Partial<MountProps> = {}) {
  const element = document.body.appendChild(document.createElement('div'));
  const session = containerSession('tenant', [role]);
  session.open(null, 'sierra-azul');
  const request = vi.fn().mockResolvedValue(tenant);
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier: 'sierra-azul', scope: 'tenant', ...extra } as MountProps);
  });
  return { session, request };
}

const card = () => screen.queryByRole('button', { name: /Identidad visual/ });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('visual identity entry in the staff panel', () => {
  it('card_is_shown_only_to_the_tenant_administrator', async () => {
    await show('TENANT_ADMINISTRATOR');
    expect(card()).toBeInTheDocument();
    expect(screen.getByText('Elige los colores de tu empresa en el canal digital.')).toBeInTheDocument();
  });

  it.each(['OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'])('the %s does not see the card', async (role) => {
    await show(role);
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    expect(card()).not.toBeInTheDocument();
  });

  it('opens the screen inside the panel, keeps the top bar and goes back to the panel', async () => {
    await show('TENANT_ADMINISTRATOR');
    fireEvent.click(card()!);
    expect(screen.getByRole('heading', { name: 'Identidad visual' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al panel' }));
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
  });

  it('passes the company name and the saved colors of the container to the screen', async () => {
    await show('TENANT_ADMINISTRATOR', { commercialName: 'Sierra Azul', visualIdentity: { primaryColor: '#112233', secondaryColor: '#445566' } });
    fireEvent.click(card()!);
    expect(screen.getByText('Sierra Azul')).toBeInTheDocument();
    expect(screen.getByLabelText('Color principal')).toHaveValue('#112233');
    expect(screen.getByLabelText('Color secundario')).toHaveValue('#445566');
  });

  it('with an older container (no props) the screen shows the defaults and the note', async () => {
    await show('TENANT_ADMINISTRATOR');
    fireEvent.click(card()!);
    expect(screen.getByText('Tu empresa usa la identidad por defecto de Multitour.')).toBeInTheDocument();
  });

  it('Cerrar sesión from the screen closes the session and shows the sign-in', async () => {
    const { session } = await show('TENANT_ADMINISTRATOR');
    fireEvent.click(card()!);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('E·set_colors_save_and_see_the_page_change: open the card, set the colors, save, the container is told', async () => {
    const onVisualIdentityChange = vi.fn();
    const { request } = await show('TENANT_ADMINISTRATOR', { onVisualIdentityChange });
    fireEvent.click(card()!);
    type('Color principal', '#146b5d');
    type('Color secundario', '#0f564b');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar identidad visual' }));
    expect(await screen.findByText('Identidad visual guardada. Tus clientes verán estos colores.')).toBeInTheDocument();
    await waitFor(() => expect(onVisualIdentityChange).toHaveBeenCalledTimes(1));
    expect(onVisualIdentityChange).toHaveBeenCalledWith({ primaryColor: '#146B5D', secondaryColor: '#0F564B' });
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/identity-audit/tenant/visual-identity');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({ primaryColor: '#146b5d', secondaryColor: '#0f564b' });
  });
});
