import { act } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MountProps } from '../contract';
import { mount } from '../mount';
import { containerSession } from './testkit';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

// Answer copied from the contract example of `getTenantLocalization`; the PUT answers it with what was sent applied.
const tenant = { tenantId: 't1', identifier: 'sierra-azul', commercialName: 'Sierra Azul', tenantStatus: 'ACTIVE', timeZone: 'America/Bogota', country: 'CO', createdAt: '2026-01-10T08:00:00Z' };

async function show(role: string, extra: Partial<MountProps> = {}) {
  const element = document.body.appendChild(document.createElement('div'));
  const session = containerSession('tenant', [role]);
  session.open(null, 'sierra-azul');
  const request = vi.fn(async (_path: string, init?: { method?: string; body?: unknown }) =>
    init?.method === 'PUT' ? { ...tenant, ...(init.body as object) } : tenant,
  );
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier: 'sierra-azul', scope: 'tenant', ...extra } as unknown as MountProps);
  });
  return { session, request };
}

const card = () => screen.queryByRole('button', { name: /Zona horaria y país/ });

describe('zone and country entry in the staff panel (portal spec 018, RN-IDA-PT-42)', () => {
  it('U·card_is_shown_only_to_the_tenant_administrator: with its line, next to the visual identity card', async () => {
    await show('TENANT_ADMINISTRATOR');

    expect(card()).toBeInTheDocument();
    expect(screen.getByText('Indica dónde opera tu empresa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Identidad visual/ })).toBeInTheDocument();
  });

  it.each(['OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'])('U·the_%s_does_not_see_the_card', async (role) => {
    await show(role);

    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    expect(card()).not.toBeInTheDocument();
  });

  it('U·opens_the_screen_inside_the_panel_keeps_the_top_bar_and_goes_back_to_the_panel', async () => {
    await show('TENANT_ADMINISTRATOR');

    fireEvent.click(card()!);
    expect(screen.getByRole('heading', { name: 'Zona horaria y país' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Zona horaria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al panel' }));

    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
  });

  it('U·a_change_made_in_the_panel_reaches_the_service_and_the_container_is_told: only the country goes out', async () => {
    const onLocalizationChange = vi.fn();
    const { request } = await show('TENANT_ADMINISTRATOR', { onLocalizationChange } as Partial<MountProps>);

    fireEvent.click(card()!);
    await screen.findByLabelText('Zona horaria');
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'PE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));

    expect(await screen.findByText('Cambio guardado. Rige desde ahora.')).toBeInTheDocument();
    const puts = request.mock.calls.filter((c) => (c[1] as { method?: string } | undefined)?.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0][1]).toMatchObject({ method: 'PUT' });
    expect((puts[0][1] as { body: unknown }).body).toEqual({ country: 'PE' });
    expect(onLocalizationChange).toHaveBeenCalledWith({ timeZone: 'America/Bogota', country: 'PE' });
  });
});
