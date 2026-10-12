import { useState } from 'react';
import type { ApiClient, Session } from '../contract';
import { tenantStatuses, type TenantStatus } from '../data/tenants';
import { messages } from '../messages';
import { PLATFORM_ADMINISTRATOR } from '../shell/roles';
import { tenantMessages as text } from './messages';
import { RegisterTenantScreen } from './RegisterTenantScreen';
import { useTenantList } from './useTenantList';
import './operator.css';

const LIMIT = 20;

export type TenantsView = 'list' | 'register';

export interface TenantsAppProps {
  apiClient: ApiClient;
  session: Session;
  // The shell that hosts this screen chooses the first view and is told when the person changes it.
  initialView?: TenantsView;
  onViewChange?: (view: TenantsView) => void;
}

// The role check hides the screen; the service refuses anyone else anyway (RN-IDA-PT-09).
export function TenantsApp({ apiClient, session, initialView = 'list', onViewChange }: TenantsAppProps) {
  // A tiny view state instead of a router: the container owns the real routes.
  const [view, setView] = useState<TenantsView>(initialView);
  if (!session.roles.includes(PLATFORM_ADMINISTRATOR)) return null;
  const go = (next: TenantsView) => {
    setView(next);
    onViewChange?.(next);
  };
  if (view === 'register') return <RegisterTenantScreen apiClient={apiClient} onBack={() => go('list')} />;
  return <TenantList apiClient={apiClient} onRegister={() => go('register')} />;
}

function TenantList({ apiClient, onRegister }: { apiClient: ApiClient; onRegister: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TenantStatus | undefined>();
  const { state, retry } = useTenantList(apiClient, { page, limit: LIMIT, status });

  return (
    <main className="operator-content">
      <header className="operator-topbar">
        <div>
          <p className="operator-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
        </div>
        <button type="button" className="operator-primary" onClick={onRegister}>
          {text.register.action}
        </button>
      </header>
      <section className="operator-panel">
        <div className="operator-panel-head">
          <div>
            <p className="operator-eyebrow">{text.panelEyebrow}</p>
            <h2>{text.panelTitle}</h2>
          </div>
          <div className="operator-filter">
            <label htmlFor="tenant-status-filter">{text.statusFilter}</label>
            <select
              id="tenant-status-filter"
              value={status ?? ''}
              onChange={(e) => {
                setStatus((e.target.value || undefined) as TenantStatus | undefined);
                setPage(1);
              }}
            >
              <option value="">{text.allStatuses}</option>
              {tenantStatuses.map((s) => (
                <option key={s} value={s}>
                  {text.statuses[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

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
        {state.kind === 'data' && state.page.data.length === 0 && <p>{text.empty}</p>}
        {state.kind === 'data' && state.page.data.length > 0 && (
          <>
            <div className="operator-table-wrap">
              <table className="operator-table">
                <thead>
                  <tr>
                    <th scope="col">{text.columns.name}</th>
                    <th scope="col">{text.columns.identifier}</th>
                    <th scope="col">{text.columns.status}</th>
                    <th scope="col">{text.columns.since}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.page.data.map((t) => (
                    <tr key={t.tenantId}>
                      <td>
                        <strong>{t.commercialName}</strong>
                      </td>
                      <td>{t.identifier}</td>
                      <td>
                        <span className={`operator-status is-${t.tenantStatus.toLowerCase()}`}>{text.statuses[t.tenantStatus]}</span>
                      </td>
                      <td>{t.createdAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="operator-pages" aria-label={text.pagination}>
              <button type="button" className="operator-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {text.previous}
              </button>
              <span>{text.pageOf(state.page.meta.page, state.page.meta.totalPages)}</span>
              <button type="button" className="operator-outline" disabled={page >= state.page.meta.totalPages} onClick={() => setPage(page + 1)}>
                {text.next}
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}
