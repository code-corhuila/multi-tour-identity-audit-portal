import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { toAuditEvent, type AuditEvent } from './audit';
import { auditMessages as text } from './auditMessages';
import { PageHeader } from './PageHeader';
import { useAuditRecords } from './useAuditRecords';
import { useOperatorNames } from './useOperatorNames';
import './audit.css';

const LIMIT = 20;

const fields = ['occurredAt', 'action', 'operator', 'change', 'actor', 'reason'] as const;
// The extended part of the record, for the detail only (HU-IDA-002 AC2).
const extended = ['affectedRecord', 'previousValue', 'newValue', 'channelOrModule', 'functionalReference'] as const;
const objects: ReadonlySet<string> = new Set(['previousValue', 'newValue']);

// "2026-10-12T14:32:00Z" is shown as "2026-10-12 14:32 UTC".
const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const valueOf = (event: AuditEvent, field: (typeof fields)[number]) => (field === 'occurredAt' ? when(event.occurredAt) : event[field]);

export function AuditView({ apiClient }: { apiClient: ApiClient }) {
  const { state, retry } = useAuditRecords(apiClient, { page: 1, limit: LIMIT });
  const names = useOperatorNames(apiClient);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const rows = useMemo(() => (state.kind === 'data' ? state.page.data.map((record) => toAuditEvent(record, names)) : []), [state, names]);

  // The native dialog gives the modal behaviour, the focus trap and Escape (spec 008 D-01).
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

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
        {state.kind === 'loading' && <p role="status">{text.loading}</p>}
        {state.kind === 'error' && (
          <div role="alert">
            <p>{text.error}</p>
            <button type="button" className="platform-primary" onClick={retry}>
              {text.retry}
            </button>
          </div>
        )}
        {state.kind === 'data' && rows.length === 0 && <p>{text.empty}</p>}
        {state.kind === 'data' && rows.length > 0 && (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  {[...fields, 'detail' as const].map((c) => (
                    <th key={c} scope="col">
                      {text.columns[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {fields.map((f) => (
                      <td key={f}>{valueOf(row, f)}</td>
                    ))}
                    <td>
                      <button type="button" className="platform-dialog-open" onClick={(e) => open(row, e.currentTarget)}>
                        {text.columns.detail}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <dialog ref={dialog} className="platform-audit-dialog" aria-labelledby="platform-audit-dialog-title" onClose={closed}>
        <div className="platform-audit-dialog-head">
          <div>
            <p className="platform-eyebrow">{text.dialogEyebrow}</p>
            <h2 id="platform-audit-dialog-title">{text.dialogTitle}</h2>
          </div>
          <button type="button" className="platform-dialog-close" aria-label={text.closeLabel} onClick={() => dialog.current?.close()}>
            {text.close}
          </button>
        </div>
        <dl className="platform-audit-detail-grid">
          {selected && (
            <>
              {fields.map((f) => (
                <div key={f}>
                  <dt>{text.columns[f]}</dt>
                  <dd>{valueOf(selected, f)}</dd>
                </div>
              ))}
              {extended.map((f) => (
                <div key={f}>
                  <dt>{text.detail[f]}</dt>
                  {/* The value before and after are objects printed as text: React escapes it, nothing in it can become markup. */}
                  <dd>{objects.has(f) && selected[f] !== text.none ? <pre>{selected[f]}</pre> : selected[f]}</dd>
                </div>
              ))}
            </>
          )}
        </dl>
      </dialog>
    </>
  );
}
