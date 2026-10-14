import type { ReactNode } from 'react';
import { platformMessages as text } from './messages';
import './platform.css';

export type PlatformItem = 'summary' | 'operators' | 'audit';

// The navigation is a constant of three entries (RN-CAL-PLT-02): a fourth cannot be added by accident, and
// "Crear operador" is the action of a page header, never an item of this list.
const ITEMS: readonly PlatformItem[] = ['summary', 'operators', 'audit'];

export interface PlatformFrameProps {
  current: PlatformItem;
  onNavigate: (item: PlatformItem) => void;
  onSignOut: () => void;
  children: ReactNode;
}

// Frame of every view of the platform panel: the Mockup's dark left sidebar and the content slot (spec 007 D-01).
export function PlatformFrame({ current, onNavigate, onSignOut, children }: PlatformFrameProps) {
  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <span className="platform-brand">
          MULTI<span>TOUR</span>
        </span>
        <p className="platform-role">{text.role}</p>
        <nav className="platform-nav" aria-label={text.navLabel}>
          {ITEMS.map((item) => (
            <button key={item} type="button" aria-current={current === item ? 'page' : undefined} onClick={() => onNavigate(item)}>
              {text.nav[item]}
            </button>
          ))}
        </nav>
        <button type="button" className="platform-signout" onClick={onSignOut}>
          {text.signOut}
        </button>
      </aside>
      <main className="platform-content">{children}</main>
    </div>
  );
}
