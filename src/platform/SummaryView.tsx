import { useEffect, useState } from 'react';
import type { ApiClient } from '../contract';
import { useTenantCounts } from '../shell/useTenantCounts';
import { tenantMessages } from '../tenants/messages';
import { useTenantList } from '../tenants/useTenantList';
import { platformMessages } from './messages';
import { PageHeader } from './PageHeader';
import { QueryNotice } from './QueryNotice';
import { TenantStatusPill } from './TenantStatusPill';

const text = platformMessages.summary;
const RECENT = 5;

// The service has no "signups this month" answer yet: the number is test data and only when the stub flag is on.
function useSignupsThisMonth(): number | undefined {
  const [value, setValue] = useState<number>();
  useEffect(() => {
    // Without the flag the build removes this import, so testData never reaches production (RN-CAL-PLT-07).
    if (import.meta.env.VITE_STUB === 'true') void import('./testData').then((m) => setValue(m.testData.signupsThisMonth)).catch(() => undefined);
  }, []);
  return value;
}

export interface SummaryViewProps {
  apiClient: ApiClient;
  onCreate: () => void;
  onSeeAll: () => void;
}

// Summary of the platform panel (Mockup admin-plataforma.html): metrics and the latest operators.
export function SummaryView({ apiClient, onCreate, onSeeAll }: SummaryViewProps) {
  const counts = useTenantCounts(apiClient);
  const recent = useTenantList(apiClient, { page: 1, limit: RECENT });
  const signups = useSignupsThisMonth();
  const metrics: [string, string | number, string][] =
    counts.state.kind === 'data'
      ? [
          [text.active, counts.state.counts.active, text.activeNote],
          [text.inactive, counts.state.counts.inactive, text.inactiveNote],
          [text.signups, signups ?? platformMessages.operators.none, text.signupsNote],
        ]
      : [];

  return (
    <>
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        action={
          <button type="button" className="platform-primary" onClick={onCreate}>
            {platformMessages.create}
          </button>
        }
      />
      <section className="platform-intro">
        <div>
          <p className="platform-eyebrow">{text.introEyebrow}</p>
          <h2>{text.introTitle}</h2>
        </div>
        <p>{text.intro}</p>
      </section>
      <div className="mt-summary-row" role="group" aria-label={text.metricsLabel}>
        <QueryNotice state={counts.state} retry={counts.retry} />
        {metrics.map(([label, value, note]) => (
          <div key={label} className="mt-summary-metric" role="group" aria-label={label}>
            <span className="mt-summary-metric-label">{label}</span>
            <strong className="mt-summary-metric-value">{value}</strong>
            <small>{label === text.signups && signups !== undefined ? text.testData : note}</small>
          </div>
        ))}
      </div>
      <section className="platform-panel">
        <div className="platform-panel-head">
          <div>
            <p className="platform-eyebrow">{text.panelEyebrow}</p>
            <h2>{text.panelTitle}</h2>
          </div>
          <button type="button" className="platform-link" onClick={onSeeAll}>
            {text.seeAll}
          </button>
        </div>
        <QueryNotice state={recent.state} retry={recent.retry} />
        {recent.state.kind === 'data' && recent.state.page.data.length === 0 && <p>{tenantMessages.empty}</p>}
        {recent.state.kind === 'data' && recent.state.page.data.length > 0 && (
          <ul className="platform-tenant-list">
            {recent.state.page.data.map((t) => (
              <li key={t.tenantId}>
                <span>
                  <strong>{t.commercialName}</strong>
                  <small>{t.identifier}</small>
                </span>
                <TenantStatusPill status={t.tenantStatus} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
