import { act } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MountProps } from '../contract';
import { mount } from '../mount';
import { containerSession } from './testkit';

let unmount = () => {};
beforeEach(() => {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

const tenant = { tenantId: 't1', identifier: 'sierra-azul', commercialName: 'Sierra Azul', tenantStatus: 'ACTIVE', timeZone: 'America/Bogota', country: 'CO', createdAt: '2026-01-10T08:00:00Z' };

async function show(role: string, extra: Partial<MountProps> = {}) {
  const element = document.body.appendChild(document.createElement('div'));
  const session = containerSession('tenant', [role]);
  session.open(null, 'sierra-azul');
  const request = vi.fn(async (_path: string, init?: { method?: string; body?: unknown }) => (init?.method === 'PUT' ? tenant : tenant));
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier: 'sierra-azul', scope: 'tenant', ...extra } as unknown as MountProps);
  });
  return { session, request };
}

const card = () => screen.queryByRole('button', { name: /Logo e imágenes/ });

describe('logo and images entry in the staff panel (portal spec 019, RN-IDA-PT-60, -67, -70)', () => {
  it('U·card_is_shown_only_to_the_tenant_administrator: with its line, next to the other cards', async () => {
    await show('TENANT_ADMINISTRATOR');
    expect(card()).toBeInTheDocument();
    expect(screen.getByText('Que tus clientes reconozcan tu empresa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Identidad visual/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zona horaria y país/ })).toBeInTheDocument();
  });

  it.each(['OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'])('U·the_%s_does_not_see_the_card', async (role) => {
    await show(role);
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    expect(card()).not.toBeInTheDocument();
  });

  it('U·opens_the_screen_inside_the_panel_with_the_files_of_the_container_and_goes_back: the top bar stays', async () => {
    await show('TENANT_ADMINISTRATOR', {
      commercialName: 'Sierra Azul',
      logoUrl: '/api/v1/identity-audit/public/tenants/sierra-azul/logo?v=abcd1234',
      images: [{ position: 1, url: '/api/v1/identity-audit/public/tenants/sierra-azul/images/1?v=abcd1234' }],
    } as Partial<MountProps>);
    fireEvent.click(card()!);
    expect(screen.getByRole('heading', { level: 1, name: 'Logo e imágenes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/api/v1/identity-audit/public/tenants/sierra-azul/logo?v=abcd1234');
    expect(screen.getByRole('img', { name: 'Imagen 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al panel' }));
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
  });

  it('U·a_file_saved_in_the_panel_reaches_the_service_and_the_container_is_told: one PUT to the logo route', async () => {
    const onTenantImagesChange = vi.fn();
    const { request } = await show('TENANT_ADMINISTRATOR', { onTenantImagesChange } as Partial<MountProps>);
    fireEvent.click(card()!);
    const logo = screen.getByRole('group', { name: 'Logo' });
    const input = logo.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar logo' }));
    expect(await screen.findByText('Cambio guardado.')).toBeInTheDocument();
    const puts = request.mock.calls.filter((c) => (c[1] as { method?: string } | undefined)?.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0][0]).toBe('/api/v1/identity-audit/tenant/logo');
    expect((puts[0][1] as { body: { contentType: string } }).body.contentType).toBe('image/png');
    expect(onTenantImagesChange).toHaveBeenCalledTimes(1);
  });

  it('the container is told after a removal too, and the files it passes later show without mounting again', async () => {
    const onTenantImagesChange = vi.fn();
    const { request } = await show('TENANT_ADMINISTRATOR', {
      onTenantImagesChange,
      logoUrl: '/api/v1/identity-audit/public/tenants/sierra-azul/logo?v=abcd1234',
    } as Partial<MountProps>);
    request.mockImplementation(async (_path: string, init?: { method?: string }) => (init?.method === 'DELETE' ? (undefined as never) : tenant));
    fireEvent.click(card()!);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(await screen.findByText('Aún no tienes un logo: se muestra la identidad de la plataforma.')).toBeInTheDocument();
    expect(onTenantImagesChange).toHaveBeenCalledTimes(1);
    expect(request.mock.calls.some((c) => (c[1] as { method?: string } | undefined)?.method === 'DELETE' && c[0] === '/api/v1/identity-audit/tenant/logo')).toBe(true);
  });

  it('U·a_container_without_the_new_props_still_mounts: the screen opens with no files', async () => {
    await show('TENANT_ADMINISTRATOR');
    fireEvent.click(card()!);
    expect(screen.getByText('Aún no tienes un logo: se muestra la identidad de la plataforma.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
