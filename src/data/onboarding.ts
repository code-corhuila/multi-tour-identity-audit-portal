import type { ApiClient } from '../contract';

// Names and values of `StartOnboardTenantRequest` and `Saga` in the openapi.yaml of multi-tour-workflow-onboard-tenant.
export interface StartOnboardTenantRequest {
  identifier: string;
  commercialName: string;
  timeZone: string;
  country: string;
  initialStatus: 'ACTIVE' | 'INACTIVE';
  administrator: { fullName: string; email: string; password: string };
}

export type SagaStep = 'CREATE_TENANT' | 'CREATE_ACCOUNT' | 'APPLY_STATUS';

export interface Saga {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'COMPENSATED' | 'FAILED';
  completedSteps: SagaStep[];
  failedStep?: SagaStep;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

const SAGA_PATH = '/api/v1/sagas/onboard-tenant';

// 201 (first start) and 200 (same key repeated) both answer the saga.
export function startOnboarding(client: ApiClient, body: StartOnboardTenantRequest, key: string, signal: AbortSignal): Promise<Saga> {
  return client.request<Saga>(SAGA_PATH, { method: 'POST', body, headers: { 'Idempotency-Key': key }, signal });
}

export function readOnboarding(client: ApiClient, id: string, signal: AbortSignal): Promise<Saga> {
  return client.request<Saga>(`${SAGA_PATH}/${encodeURIComponent(id)}`, { method: 'GET', signal });
}
