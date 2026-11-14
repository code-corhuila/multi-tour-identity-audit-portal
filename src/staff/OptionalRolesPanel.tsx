import { useState } from 'react';
import type { ApiClient } from '../contract';
import { staffMessages } from './messages';
import { useAuditAccess } from './useAuditAccess';

const t = staffMessages.optionalRoles;

// Gerente, Contador and Analista are query-only roles the tenant enables one by one (Mockup optional roles panel).
// The checkbox that enables the role keeps its state on the screen: no service exists for it yet (HU-SEC-006, gap G-3 of portal spec 015).
// The switch of the audit access is real (HU-IDA-002 AC6): it asks the identity-audit service and shows what it answered. Without a
// client (an older caller) the panel has no such switch.
export function OptionalRolesPanel({ apiClient }: { apiClient?: ApiClient }) {
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState('');
  const access = useAuditAccess(apiClient);

  function toggle(role: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(role);
    else next.delete(role);
    setEnabled(next);
    setFeedback(t.changed(role, on));
  }

  async function toggleAudit(role: string, on: boolean) {
    const result = await access.change(t.codes[role], on);
    setFeedback('failed' in result ? t.auditChangeFailed(role) : t.auditChanged(role, result.enabled));
  }

  return (
    <section className="operator-panel" aria-labelledby="optional-roles-title">
      <p className="operator-eyebrow">{t.eyebrow}</p>
      <h2 id="optional-roles-title">{t.title}</h2>
      <p className="operator-copy">{t.copy}</p>
      {apiClient && access.read.kind === 'error' && (
        <div role="alert">
          <p>{t.auditLoadFailed}</p>
          <button type="button" className="operator-outline" onClick={access.retry}>
            {t.retry}
          </button>
        </div>
      )}
      <ul className="optional-roles-list">
        {t.roles.map((role) => (
          <li key={role}>
            <label>
              <input type="checkbox" checked={enabled.has(role)} onChange={(e) => toggle(role, e.target.checked)} /> {role}
            </label>
            {apiClient && access.read.kind === 'data' && (
              <label>
                <input
                  type="checkbox"
                  aria-label={t.auditSwitchLabel(role)}
                  checked={access.read.enabled.get(t.codes[role]) ?? false}
                  disabled={access.pending.has(t.codes[role])}
                  onChange={(e) => void toggleAudit(role, e.target.checked)}
                />{' '}
                {t.auditSwitch}
              </label>
            )}
          </li>
        ))}
      </ul>
      <p className="operator-form-feedback" aria-live="polite">
        {feedback}
      </p>
    </section>
  );
}
