import { useState } from 'react';
import { staffMessages } from './messages';

const t = staffMessages.optionalRoles;

// Gerente, Contador and Analista are query-only roles the tenant enables one by one (Mockup optional roles panel).
// No service exists yet (HU-SEC-006): the checkbox only changes local state and says the change is audited.
export function OptionalRolesPanel() {
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState('');

  function toggle(role: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(role);
    else next.delete(role);
    setEnabled(next);
    setFeedback(t.changed(role, on));
  }

  return (
    <section className="operator-panel" aria-labelledby="optional-roles-title">
      <p className="operator-eyebrow">{t.eyebrow}</p>
      <h2 id="optional-roles-title">{t.title}</h2>
      <p className="operator-copy">{t.copy}</p>
      <ul className="optional-roles-list">
        {t.roles.map((role) => (
          <li key={role}>
            <label>
              <input type="checkbox" checked={enabled.has(role)} onChange={(e) => toggle(role, e.target.checked)} /> {role}
            </label>
          </li>
        ))}
      </ul>
      <p className="operator-form-feedback" aria-live="polite">
        {feedback}
      </p>
    </section>
  );
}
