import type { AuditEvent } from './audit';
import { auditMessages as text } from './auditMessages';
import { fields, valueOf, type AuditField } from './auditColumns';

interface Props {
  rows: readonly AuditEvent[];
  columns?: readonly AuditField[];
  // Called with the row and the button that was pressed, so the caller can give the focus back to it.
  onOpen: (event: AuditEvent, button: HTMLButtonElement) => void;
}

export function AuditTable({ rows, columns = fields, onOpen }: Props) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-table">
        <thead>
          <tr>
            {[...columns, 'detail' as const].map((c) => (
              <th key={c} scope="col">
                {text.columns[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((f) => (
                <td key={f}>{valueOf(row, f)}</td>
              ))}
              <td>
                <button type="button" className="platform-dialog-open" onClick={(e) => onOpen(row, e.currentTarget)}>
                  {text.columns.detail}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
