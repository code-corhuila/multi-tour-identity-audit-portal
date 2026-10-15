import { useState } from 'react';
import { staffMessages } from './messages';
import { PERMISSIONS, policyOf, stateOf, type Permission } from './permissions';

const t = staffMessages.detail.permissions;

interface AuditEntry {
  at: string;
  permission: Permission;
  action: string;
  reason: string;
}

// Permissions of one user (Mockup admin-detalle-colaborador.html): assign or withdraw each one, with an optional
// reason and the audit table. HU-SEC-006 is not built, so it only changes local state and sends nothing.
// Assignments of the session by user: the fixture has no service, so they live here and survive leaving the detail.
// shortcut: module memory, cleared with the page; replace by the call of HU-SEC-006 when it exists.
const assigned = new Map<string, { granted: ReadonlySet<Permission>; audit: AuditEntry[] }>();
export const resetAssignedPermissions = () => assigned.clear();

export function PermissionsPanel({ role, memberId }: { role: string; memberId: string }) {
  const saved = assigned.get(memberId);
  const [granted, setGranted] = useState<ReadonlySet<Permission>>(saved?.granted ?? new Set());
  const [reason, setReason] = useState('');
  const [audit, setAudit] = useState<AuditEntry[]>(saved?.audit ?? []);

  function toggle(permission: Permission, on: boolean) {
    const next = new Set(granted);
    if (on) next.add(permission);
    else next.delete(permission);
    const entries = [{ at: new Date().toISOString().slice(0, 16).replace('T', ' '), permission, action: on ? t.actionAssigned : t.actionWithdrawn, reason: reason.trim() || '—' }, ...audit];
    setGranted(next);
    setAudit(entries);
    assigned.set(memberId, { granted: next, audit: entries });
    setReason('');
  }

  return (
    <section className="operator-panel" aria-labelledby="perm-title">
      <p className="operator-eyebrow">{t.eyebrow}</p>
      <h2 id="perm-title">{t.title}</h2>
      {policyOf(role).queryOnly && <p className="operator-copy">{t.queryOnly(role)}</p>}
      <div className="operator-table-wrap">
        <table className="operator-table" aria-label={t.tableLabel}>
          <thead>
            <tr>
              <th>{t.columns.permission}</th>
              <th>{t.columns.state}</th>
              <th>{t.columns.action}</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => {
              const state = stateOf(role, permission, granted);
              return (
                <tr key={permission}>
                  <td>
                    <strong>{permission}</strong>
                  </td>
                  <td>{t.states[state]}</td>
                  <td>
                    {(state === 'free' || state === 'granted') && (
                      <button type="button" className="operator-outline" onClick={() => toggle(permission, state === 'free')}>
                        {state === 'granted' ? t.withdraw : t.assign}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <label className="operator-form-wide">
        {t.reason}
        <input type="text" value={reason} placeholder={t.reasonPlaceholder} onChange={(e) => setReason(e.target.value)} />
      </label>
      <p className="operator-eyebrow">{t.auditEyebrow}</p>
      <div className="operator-table-wrap">
        <table className="operator-table" aria-label={t.auditLabel}>
          <thead>
            <tr>
              <th>{t.auditColumns.at}</th>
              <th>{t.auditColumns.permission}</th>
              <th>{t.auditColumns.action}</th>
              <th>{t.auditColumns.reason}</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 ? (
              <tr>
                <td colSpan={4}>{t.auditEmpty}</td>
              </tr>
            ) : (
              audit.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.at}</td>
                  <td>{entry.permission}</td>
                  <td>{entry.action}</td>
                  <td>{entry.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
