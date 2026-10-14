import { vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';

export const tenant = (over: Partial<TenantResponse> = {}): TenantResponse => ({
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  identifier: 'travesia-natural',
  commercialName: 'Travesia Natural',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  createdAt: '2026-01-10T08:00:00Z',
  ...over,
});

export const page = (data: TenantResponse[], meta = {}) => ({
  data,
  meta: { page: 1, limit: 20, total: data.length, totalPages: 1, ...meta },
});

// Answers the list: one-item pages carry the totals of the counts, other pages carry `rows`.
export function listClient(rows: TenantResponse[], totals: Record<string, number> = { ALL: 3, ACTIVE: 2, INACTIVE: 1 }) {
  const request = vi.fn(async (path: string) => {
    const status = /status=(\w+)/.exec(path)?.[1] ?? 'ALL';
    const limit = Number(/limit=(\d+)/.exec(path)?.[1]);
    return limit === 1 ? page([], { limit, total: totals[status] }) : page(rows);
  });
  return { request, apiClient: { request } as unknown as ApiClient };
}
