import { act } from 'react';
import { vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { mount } from '../mount';

// Test kit of the shell tests: mounts the portal with a stub client and a session whose close drops the roles.
let unmount = () => {};
export const unmountPortal = async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
};

const totals: Record<string, number> = { ALL: 3, ACTIVE: 2, INACTIVE: 1 };
const listRequest = () =>
  vi.fn(async (path: string) => {
    const status = /status=(\w+)/.exec(path)?.[1] ?? 'ALL';
    const data = status === 'ALL' ? [{ tenantId: 't1', identifier: 'sierra-azul', commercialName: 'Sierra Azul', tenantStatus: 'ACTIVE', timeZone: 'America/Bogota', country: 'CO', createdAt: '2026-01-10T08:00:00Z' }] : [];
    return { data, meta: { page: 1, limit: 20, total: totals[status], totalPages: 1 } };
  }) as unknown as ApiClient['request'] & ReturnType<typeof vi.fn>;

export async function show(roles: string[], identifier?: string, access?: Session['access']) {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles, access, open: vi.fn(), close: vi.fn() };
  session.close = vi.fn(() => {
    session.roles = [];
  });
  const request = listRequest();
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier });
  });
  return { session, request };
}