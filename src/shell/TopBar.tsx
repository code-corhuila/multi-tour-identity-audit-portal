import type { ReactNode } from 'react';
import { shellMessages } from './messages';
import './shell.css';

export interface TopBarProps {
  // Under the brand, e.g. the role of the person.
  role: string;
  // Navigation of the shell, between the role and the sign-out.
  nav?: ReactNode;
  onSignOut: () => void;
}

// Top bar of the Mockup's operator and platform shells; "Cerrar sesión" hands over to the caller (session.close()).
export function TopBar({ role, nav, onSignOut }: TopBarProps) {
  return (
    <header className="shell-bar">
      <span className="shell-brand">
        MULTI<span>TOUR</span>
      </span>
      <span className="shell-role">{role}</span>
      <div className="shell-nav">{nav}</div>
      <button type="button" className="shell-signout" onClick={onSignOut}>
        {shellMessages.signOut}
      </button>
    </header>
  );
}
