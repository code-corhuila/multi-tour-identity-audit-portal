import { useState } from 'react';
import type { ApiClient, Session } from '../contract';
import { messages } from '../messages';
import { TenantsApp, type TenantsView } from '../tenants/TenantsApp';
import { shellMessages } from './messages';
import { PLATFORM_ADMINISTRATOR } from './roles';
import { TopBar } from './TopBar';
import { useTenantCounts } from './useTenantCounts';
import '../tenants/operator.css';

const text = shellMessages.platform;
type View = 'summary' | TenantsView;

function Summary({ apiClient }: { apiClient: ApiClient }) {
  const { state, retry } = useTenantCounts(apiClient);
  const metrics: [string, number][] =
    state.kind === 'data'
      ? [[text.total, state.counts.total], [text.active, state.counts.active], [text.inactive, state.counts.inactive]]
      : [];
  return (
    <main className="operator-content">
      <div className="operator-topbar">
        <div>
          <p className="operator-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
        </div>
      </div>
      <p className="shell-intro">{text.intro}</p>
      {state.kind === 'loading' && <p role="status">{text.loading}</p>}
      {state.kind === 'error' && (
        <div role="alert" className="operator-error">
          <p>
            {messages.errors.unavailable}
            {state.traceId && ` (${messages.errors.trace}: ${state.traceId})`}
          </p>
          <button type="button" className="operator-outline" onClick={retry}>
            {text.retry}
          </button>
        </div>
      )}
      <div className="shell-cards">
        {metrics.map(([label, value]) => (
          <div key={label} className="shell-card" role="group" aria-label={label}>
            <span>{label}</span>
            <strong className="shell-metric">{value}</strong>
          </div>
        ))}
      </div>
    </main>
  );
}

// Shell of the Platform Administrator (Mockup admin-plataforma.html): top bar with the three pages and the sign-out.
export function PlatformShell({ apiClient, session, onSignOut }: { apiClient: ApiClient; session: Session; onSignOut: () => void }) {
  const [view, setView] = useState<View>('summary');
  if (!session.roles.includes(PLATFORM_ADMINISTRATOR)) return null;
  const items: [View, string][] = [
    ['summary', text.nav.summary],
    ['list', text.nav.list],
    ['register', text.nav.register],
  ];
  const nav = (
    <nav aria-label={text.navLabel} className="shell-nav-items">
      {items.map(([target, label]) => (
        <button key={target} type="button" className="shell-nav-item" aria-current={view === target ? 'page' : undefined} onClick={() => setView(target)}>
          {label}
        </button>
      ))}
    </nav>
  );
  return (
    <div className="shell">
      <TopBar role={text.role} nav={nav} onSignOut={onSignOut} />
      {view === 'summary' ? (
        <Summary apiClient={apiClient} />
      ) : (
        // `key` restarts the screen when the person picks the other page from the top bar.
        <TenantsApp key={view} apiClient={apiClient} session={session} initialView={view} onViewChange={(next) => setView(next)} />
      )}
    </div>
  );
}
