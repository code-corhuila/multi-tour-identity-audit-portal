import { useEffect, useRef } from 'react';
import type { AuditEvent } from './audit';
import { auditMessages as text } from './auditMessages';
import { fields, valueOf, type AuditField } from './auditColumns';

// The extended part of the record, for the detail only (HU-IDA-002 AC2).
const extended = ['affectedRecord', 'previousValue', 'newValue', 'channelOrModule', 'functionalReference'] as const;
const objects: ReadonlySet<string> = new Set(['previousValue', 'newValue']);

interface Props {
  selected: AuditEvent | null;
  columns?: readonly AuditField[];
  // Fired by "Cerrar" and by Escape alike.
  onClose: () => void;
}

// The native dialog gives the modal behaviour, the focus trap and Escape (spec 008 D-01).
export function AuditDetailDialog({ selected, columns = fields, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  return (
    <dialog ref={dialog} className="platform-audit-dialog" aria-labelledby="platform-audit-dialog-title" onClose={onClose}>
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
            {columns.map((f) => (
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
  );
}
