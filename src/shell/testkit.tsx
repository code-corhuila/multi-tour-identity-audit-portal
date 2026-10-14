import { act } from 'react';
import { vi } from 'vitest';
import type { ApiClient, Scope, Session } from '../contract';
import { mount } from '../mount';

// A session that behaves like multi-tour-front's: in the general scope `open` needs the company the answer is for and
// refuses (throws, opening nothing) when it is missing or malformed, so a mismatch with the container fails here too.
// Opening grants `grants` as roles; closing drops the roles and the access mark.
export function containerSession(scope: Scope | undefined, grants: string[] = []): Session {
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  session.open = vi.fn((_answer: unknown, identifier?: string) => {
    if (scope === 'general' && !(identifier && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(identifier) && identifier.length >= 3 && identifier.length <= 40)) {
      throw new Error('A valid company is required to open a session in the general scope');
    }
    session.roles = grants;
  });
  session.close = vi.fn(() => {
    session.roles = [];
    session.access = undefined;
  });
  return session;
}

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

export async function show(roles: string[], identifier?: string, access?: Session['access'], account?: Session['account']) {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles, access, account, open: vi.fn(), close: vi.fn() };
  // Like the container's session: closing it drops the roles and the access mark.
  session.close = vi.fn(() => {
    session.roles = [];
    session.access = undefined;
  });
  const request = listRequest();
  await act(async () => {
    unmount = mount(element, { apiClient: { request }, session, identifier });
  });
  return { session, request };
}