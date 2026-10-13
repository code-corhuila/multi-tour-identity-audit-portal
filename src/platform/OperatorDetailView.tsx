import { useState, type FormEvent } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { inactivateTenant, type TenantResponse } from '../data/tenants';
import { messages } from '../messages';
import { tenantMessages } from '../tenants/messages';
import { platformMessages } from './messages';
import { PageHeader } from './PageHeader';
import { useTenant } from './useTenant';

const t = platformMessages.detail;
const MAX_REASON = 500;

export interface OperatorDetailViewProps {
  apiClient: ApiClient;
  tenantId: string;
  onBack: () => void;
}

// Detail view of the platform panel: the Mockup's band, state panel and scope panel (spec 007 PT-03).
export function OperatorDetailView({ apiClient, tenantId, onBack }: OperatorDetailViewProps) {
  const { state, retry, replace } = useTenant(apiClient, tenantId);
  const back = (
    <button type="button" className="platform-link" onClick={onBack}>
      {t.back}
    </button>
  );

  if (state.kind === 'loading') return <p role="status">{tenantMessages.loading}</p>;
  if (state.kind === 'error') {
    return (
      <div role="alert">
        <p>
          {state.status === 404 ? t.notFound : messages.errors.unavailable}
          {state.status !== 404 && state.traceId && ` (${messages.errors.trace}: ${state.traceId})`}
        </p>
        {state.status !== 404 && (
          <button type="button" className="platform-link" onClick={retry}>
            {tenantMessages.retry}
          </button>
        )}
        {back}
      </div>
    );
  }

  const { tenant } = state;
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={tenant.commercialName} action={back} />
      <section className="platform-band platform-tenant-hero" aria-label={t.bandLabel}>
        <div>
          <span className={`platform-status is-${tenant.tenantStatus === 'ACTIVE' ? 'active' : 'inactive'}`}>{tenantMessages.statuses[tenant.tenantStatus]}</span>
          <p>{t.identifier(tenant.identifier)}</p>
        </div>
        <div className="platform-tenant-hero-admin">
          <span>{t.firstAdministrator}</span>
          <strong>{tenant.firstAdministratorMembershipId ?? t.unassigned}</strong>
        </div>
      </section>
      <div className="platform-detail-grid">
        <StatePanel apiClient={apiClient} tenant={tenant} onChanged={replace} />
        <section className="platform-panel" aria-label={t.scopeEyebrow}>
          <p className="platform-eyebrow">{t.scopeEyebrow}</p>
          <h2>{t.scopeTitle}</h2>
          <ul className="platform-scope-list">
            {t.scope.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function StatePanel({ apiClient, tenant, onChanged }: { apiClient: ApiClient; tenant: TenantResponse; onChanged: (tenant: TenantResponse) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const copy = t.states[tenant.tenantStatus];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t.reasonRequired);
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      onChanged(await inactivateTenant(apiClient, tenant.tenantId, trimmed));
    } catch (failure) {
      const { status, traceId } = (failure ?? {}) as ApiError;
      const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
      setError(status === 422 ? t.notActive : `${messages.errors.unavailable}${trace}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="platform-panel" aria-label={t.stateEyebrow}>
      <p className="platform-eyebrow">{t.stateEyebrow}</p>
      <h2>{copy.title}</h2>
      <p className="platform-section-copy">{copy.copy}</p>
      {tenant.tenantStatus === 'ACTIVE' ? (
        <form className="platform-state-form" onSubmit={onSubmit} noValidate>
          <label htmlFor="inactivation-reason">{t.reasonLabel}</label>
          <textarea id="inactivation-reason" rows={3} maxLength={MAX_REASON} placeholder={t.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={error ? 'inactivation-error' : undefined} />
          <p id="inactivation-error" className="auth-feedback is-error" aria-live="polite">
            {error}
          </p>
          <button className="platform-danger" type="submit" disabled={sending}>
            {sending ? t.inactivating : t.inactivate}
          </button>
        </form>
      ) : (
        tenant.statusReason && (
          <p>
            <strong>{t.reasonShown}:</strong> <span>{tenant.statusReason}</span>
          </p>
        )
      )}
    </section>
  );
}
