import { useState, type FormEvent } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { inactivateTenant, reactivateTenant, type TenantResponse } from '../data/tenants';
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

// Detail view of the platform panel: the Mockup's band, state panel and scope panel (spec 007 PT-03; status
// change built by the amendment of spec 001, 2026-10-23).
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
        <StatePanel tenant={tenant} apiClient={apiClient} tenantId={tenantId} onChanged={replace} onRequestReload={retry} />
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

// "Responsable: <who> · <when>", the local date and time as the platform panel shows them elsewhere.
function formatChangedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

interface StatePanelProps {
  tenant: TenantResponse;
  apiClient: ApiClient;
  tenantId: string;
  onChanged: (tenant: TenantResponse) => void;
  onRequestReload: () => void;
}

// RN-IDA-PT-05, -10, -11: a reason, a confirmation that names the tenant and lists what the change does, sent
// once; the service's answer decides the next screen (the Mockup's `admin-detalle-operador.html` flow).
function StatePanel({ tenant, apiClient, tenantId, onChanged, onRequestReload }: StatePanelProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const copy = t.states[tenant.tenantStatus];
  const active = tenant.tenantStatus === 'ACTIVE';
  const canChange = tenant.tenantStatus === 'ACTIVE' || tenant.tenantStatus === 'INACTIVE';
  const reasonId = 'status-change-reason';

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setError(t.reasonRequired(active));
      return;
    }
    setError(undefined);
    setConfirming(true);
  }

  async function onConfirm() {
    setSending(true);
    try {
      const updated = active ? await inactivateTenant(apiClient, tenantId, reason.trim()) : await reactivateTenant(apiClient, tenantId, reason.trim());
      setConfirming(false);
      setReason('');
      setError(undefined);
      onChanged(updated);
    } catch (thrown: unknown) {
      const { status, traceId } = (thrown ?? {}) as ApiError;
      setConfirming(false);
      setError(status === 422 ? t.alreadyChanged : `${messages.errors.unavailable}${traceId ? ` (${messages.errors.trace}: ${traceId})` : ''}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="platform-panel" aria-label={t.stateEyebrow}>
      <p className="platform-eyebrow">{t.stateEyebrow}</p>
      <h2>{copy.title}</h2>
      <p className="platform-section-copy">{copy.copy}</p>
      {canChange && (
        <form className="platform-state-form" onSubmit={onSubmit} noValidate>
          <label htmlFor={reasonId}>{t.reasonLabel(active)}</label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={MAX_REASON}
            placeholder={t.reasonPlaceholder(active)}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-describedby="status-change-feedback"
          />
          <p id="status-change-feedback" className={error && error !== t.alreadyChanged ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
            {error && error !== t.alreadyChanged ? error : null}
          </p>
          <button className={active ? 'platform-danger' : 'platform-primary'} type="submit">
            {t.action(active)}
          </button>
        </form>
      )}
      {error === t.alreadyChanged && (
        <p className="auth-feedback is-error" role="alert">
          {t.alreadyChanged}{' '}
          <button type="button" className="platform-link" onClick={onRequestReload}>
            {t.reload}
          </button>
        </p>
      )}
      {(tenant.statusReason || tenant.statusChangedBy) && (
        <p>
          {tenant.statusReason && (
            <>
              <strong>{t.reasonShown}:</strong> <span>{tenant.statusReason}</span>
              <br />
            </>
          )}
          {tenant.statusChangedBy && tenant.statusChangedAt && <span>{t.changedBy(tenant.statusChangedBy, formatChangedAt(tenant.statusChangedAt))}</span>}
        </p>
      )}
      {confirming && (
        <div role="dialog" aria-modal="true" aria-label={t.confirmTitle(active, tenant.commercialName)} className="platform-state-dialog">
          <h3>{t.confirmTitle(active, tenant.commercialName)}</h3>
          <ul>
            {(active ? t.consequences.inactivate : t.consequences.reactivate).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="platform-state-dialog-actions">
            <button type="button" className="platform-outline" onClick={() => setConfirming(false)}>
              {t.cancel}
            </button>
            <button type="button" className={active ? 'platform-danger' : 'platform-primary'} onClick={onConfirm} disabled={sending}>
              {t.confirmButton(active)}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
