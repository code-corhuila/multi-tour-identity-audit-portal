import { useState } from 'react';
import type { ApiClient } from '../contract';
import { tenantMessages as list } from '../tenants/messages';
import { useTenantList } from '../tenants/useTenantList';
import { platformMessages } from './messages';
import { PageHeader } from './PageHeader';
import { QueryNotice } from './QueryNotice';
import { TenantStatusPill } from './TenantStatusPill';

const text = platformMessages.operators;
const LIMIT = 20;

export interface OperatorsViewProps {
  apiClient: ApiClient;
  onCreate: () => void;
  onOpen: (tenantId: string) => void;
}

// Operators of the platform panel (Mockup admin-operadores.html): the table of companies; a row opens its detail.
export function OperatorsView({ apiClient, onCreate, onOpen }: OperatorsViewProps) {
  const [page, setPage] = useState(1);
  const { state, retry } = useTenantList(apiClient, { page, limit: LIMIT });

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
      <section className="platform-panel">
        <div className="platform-panel-head">
          <div>
            <p className="platform-eyebrow">{text.panelEyebrow}</p>
            <h2>{text.panelTitle}</h2>
          </div>
          <span className="platform-table-note">{text.note}</span>
        </div>
        <QueryNotice state={state} retry={retry} />
        {state.kind === 'data' && state.page.data.length === 0 && <p>{list.empty}</p>}
        {state.kind === 'data' && state.page.data.length > 0 && (
          <>
            <div className="platform-table-wrap">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th scope="col">{text.columns.operator}</th>
                    <th scope="col">{text.columns.identifier}</th>
                    <th scope="col">{text.columns.firstAdministrator}</th>
                    <th scope="col">{text.columns.status}</th>
                    <th scope="col">{text.columns.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.page.data.map((t) => (
                    <tr key={t.tenantId}>
                      <td>
                        <strong>{t.commercialName}</strong>
                        <small>{text.created(Number.isNaN(Date.parse(t.createdAt)) ? text.none : t.createdAt.slice(0, 10))}</small>
                      </td>
                      <td>{t.identifier}</td>
                      <td>{t.firstAdministratorMembershipId ?? text.none}</td>
                      <td>
                        <TenantStatusPill status={t.tenantStatus} />
                      </td>
                      <td>
                        <button type="button" className="platform-link" onClick={() => onOpen(t.tenantId)}>
                          {text.open}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="platform-pages" aria-label={list.pagination}>
              <button type="button" className="platform-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {list.previous}
              </button>
              <span>{list.pageOf(state.page.meta.page, state.page.meta.totalPages)}</span>
              <button type="button" className="platform-outline" disabled={page >= state.page.meta.totalPages} onClick={() => setPage(page + 1)}>
                {list.next}
              </button>
            </nav>
          </>
        )}
      </section>
    </>
  );
}
