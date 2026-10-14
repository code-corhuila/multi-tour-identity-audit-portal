import { useState } from 'react';
import type { Session } from '../contract';
import { profileMessages as t } from './messages';
import { useAccount } from './useAccount';
import '../tenants/operator.css';
import '../shell/shell.css';
import './profile.css';

export interface ProfileScreenProps {
  session: Session;
  // "Volver al panel cliente" or "Volver al panel": the text follows the role of the caller.
  backLabel: string;
  onBack: () => void;
  onSignOut: () => void;
}

const initialsOf = (name?: string, email?: string): string => {
  const words = (name ?? '').split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (email?.[0] ?? '?').toUpperCase();
};

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <input readOnly value={value ?? t.notRegistered} />
    </label>
  );
}

// "Mi perfil" (Mockup profile.html): the account the container's session carries, read-only, and the sign-out.
export function ProfileScreen({ session, backLabel, onBack, onSignOut }: ProfileScreenProps) {
  const account = useAccount(session);
  const [editing, setEditing] = useState(false);

  if (!account) {
    return (
      <div className="shell">
        <main className="operator-content profile">
          <p role="alert" className="profile-error">{t.error.message}</p>
          <button type="button" className="profile-link" onClick={onSignOut}>{t.error.action}</button>
        </main>
      </div>
    );
  }
  return (
    <div className="shell">
      <main className="operator-content profile">
        <button type="button" className="profile-link" onClick={onBack}>{backLabel}</button>
        <h1>{t.title}</h1>
        <p className="shell-intro">{t.intro}</p>
        <div role="group" aria-label={t.identity} className="profile-card">
          <span className="profile-avatar" aria-hidden="true">{initialsOf(account.name, account.email)}</span>
          <div>
            <strong>{account.name ?? t.notRegistered}</strong>
            <span>{account.email ?? t.notRegistered}</span>
          </div>
        </div>
        <section>
          <h2>{t.account.title}</h2>
          <div className="profile-grid">
            <ReadOnlyField label={t.account.name} value={account.name} />
            <ReadOnlyField label={t.account.email} value={account.email} />
            <ReadOnlyField label={t.account.role} value={account.role} />
          </div>
        </section>
        <section>
          <h2>{t.personal.title}</h2>
          <div className="profile-grid">
            <ReadOnlyField label={t.personal.phone} value={account.phone} />
          </div>
        </section>
        <section>
          <h2>{t.security.title}</h2>
          <div className="profile-rows">
            <button type="button" className="profile-row" aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {t.security.edit}
            </button>
            <button type="button" className="profile-row" disabled>
              {t.security.changePassword}
            </button>
            <button type="button" className="profile-row" onClick={onBack}>
              {t.security.back}
            </button>
          </div>
          {editing && <p role="status" className="shell-intro">{t.editNote}</p>}
        </section>
        <button type="button" className="profile-signout" onClick={onSignOut}>{t.signOut}</button>
      </main>
    </div>
  );
}
