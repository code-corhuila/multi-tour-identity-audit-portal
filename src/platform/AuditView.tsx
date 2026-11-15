import { useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { auditPeriod, toAuditEvent, type AuditEvent } from './audit';
import { AuditFilters, NO_FILTERS, type AuditFilterValues } from './AuditFilters';
import { auditMessages as text } from './auditMessages';
import { AuditDetailDialog } from './AuditDetailDialog';
import { AuditPager } from './AuditPager';
import { AuditTable } from './AuditTable';
import { PageHeader } from './PageHeader';
import { useAuditRecords } from './useAuditRecords';
import { useOperatorNames } from './useOperatorNames';
import './audit.css';

const LIMIT = 20;

export function AuditView({ apiClient }: { apiClient: ApiClient }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilterValues>(NO_FILTERS);
  const { invalidPeriod, period } = auditPeriod(filters.fromDay, filters.toDay);
  // Only what was really asked counts: an inverted period is not asked, so on its own it is not a filter that matched nothing.
  const filtered = Boolean(filters.action || filters.tenantId || period.from || period.to);
  const { state, retry } = useAuditRecords(apiClient, {
    page,
    limit: LIMIT,
    action: filters.action || undefined,
    tenantId: filters.tenantId || undefined,
    ...period,
  });
  const names = useOperatorNames(apiClient);
  // Any change of a filter goes back to the first page: the page that was shown may not exist in the new list.
  const change = (next: Partial<AuditFilterValues>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const rows = useMemo(() => (state.kind === 'data' ? state.page.data.map((record) => toAuditEvent(record, names)) : []), [state, names]);

  const open = (event: AuditEvent, button: HTMLButtonElement) => {
    trigger.current = button;
    setSelected(event);
  };

  // Fired by "Cerrar" and by Escape alike: the focus goes back to the button that opened the detail.
  const closed = () => {
    setSelected(null);
    trigger.current?.focus();
  };

  return (
    <>
      <PageHeader eyebrow={text.eyebrow} title={text.title} />
      <section className="platform-intro">
        <div>
          <p className="platform-eyebrow">{text.introEyebrow}</p>
          <h2>{text.introTitle}</h2>
        </div>
        <p>{text.introNote}</p>
      </section>
      <section className="platform-panel">
        <AuditFilters values={filters} onChange={change} operators={names} invalidPeriod={invalidPeriod} />
        {state.kind === 'loading' && <p role="status">{text.loading}</p>}
        {state.kind === 'error' && (
          <div role="alert">
            <p>{text.error}</p>
            <button type="button" className="platform-primary" onClick={retry}>
              {text.retry}
            </button>
          </div>
        )}
        {state.kind === 'data' && rows.length === 0 && <p>{filtered ? text.emptyFiltered : text.empty}</p>}
        {state.kind === 'data' && rows.length > 0 && (
          <>
            <AuditTable rows={rows} onOpen={open} />
            <AuditPager page={page} totalPages={state.page.meta.totalPages} onPage={setPage} />
          </>
        )}
      </section>
      <AuditDetailDialog selected={selected} onClose={closed} />
    </>
  );
}
