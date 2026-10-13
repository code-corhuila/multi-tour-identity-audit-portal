import type { TenantStatus } from '../data/tenants';
import { tenantMessages as text } from '../tenants/messages';

// The Mockup has two pills; a tenant that is not active (pending, failed) takes the inactive one.
export function TenantStatusPill({ status }: { status: TenantStatus }) {
  return <span className={`platform-status ${status === 'ACTIVE' ? 'is-active' : 'is-inactive'}`}>{text.statuses[status]}</span>;
}
