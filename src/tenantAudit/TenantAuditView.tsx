import { useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { listOwnAuditRecords } from '../data/audit';
import { auditPeriod, toAuditEvent, type AuditEvent } from '../platform/audit';
import { AuditFilters, NO_FILTERS, type AuditFilterValues } from '../platform/AuditFilters';
import { AuditPager } from '../platform/AuditPager';
import { tenantFields } from '../platform/auditColumns';
import { AuditDetailDialog } from '../platform/AuditDetailDialog';
import { auditMessages as text } from '../platform/auditMessages';
import { AuditTable } from '../platform/AuditTable';
import { PageHeader } from '../platform/PageHeader';
import { useAuditRecords } from '../platform/useAuditRecords';
import { tenantAuditMessages as t } from './tenantAuditMessages';
import '../platform/audit.css';

const LIMIT = 20;
const FORBIDDEN = 403;
// Every record is of the tenant of the reader, so there are no operator names to look up.
const NO_OPERATORS: ReadonlyMap<string, string> = new Map();

// The Administrator reads the audit of the tenant and the roles it enabled read it too; the service decides who may (AC5), and
// the screen shows its answer (spec 015 D-05). `administrator` only chooses the note under the title.
export function TenantAuditView({ apiClient, administrator }: { apiClient: ApiClient; administrator: boolean }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilterValues>(NO_FILTERS);
  const { invalidPeriod, period } = auditPeriod(filters.fromDay, filters.toDay);
  // Only what was really asked counts: an inverted period is not asked, so on its own it is not a filter that matched nothing.
  const filtered = Boolean(filters.action || period.from || period.to);
  const { state, retry } = useAuditRecords(apiClient, { page, limit: LIMIT, action: filters.action || undefined, ...period }, listOwnAuditRecords);
  // Any change of a filter goes back to the first page: the page that was shown may not exist in the new list.
  const change = (next: Partial<AuditFilterValues>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const rows = useMemo(() => (state.kind === 'data' ? state.page.data.map((record) => toAuditEvent(record, NO_OPERATORS)) : []), [state]);

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
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      {state.kind === 'error' && state.status === FORBIDDEN ? (
        <section className="platform-panel">
          <p role="status">{t.refused}</p>
        </section>
      ) : (
        <>
          <section className="platform-intro">
            <div>
              <p className="platform-eyebrow">{t.introEyebrow}</p>
              <h2>{t.introTitle}</h2>
            </div>
            <p>{administrator ? t.noteAdministrator : t.noteReader}</p>
          </section>
          <section className="platform-panel">
            <AuditFilters values={filters} onChange={change} invalidPeriod={invalidPeriod} />
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
                <AuditTable rows={rows} columns={tenantFields} onOpen={open} />
                <AuditPager page={page} totalPages={state.page.meta.totalPages} onPage={setPage} />
              </>
            )}
            <p>{t.metadataOnly}</p>
          </section>
        </>
      )}
      <AuditDetailDialog selected={selected} columns={tenantFields} onClose={closed} />
    </>
  );
}
