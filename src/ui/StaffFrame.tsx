import type { ReactNode } from 'react';
import { NavLink } from './navigation';
import { staffFrameMessages as text } from './staffFrameMessages';
import './staffFrame.css';

export type StaffItem = 'summary' | 'staff';

type Entry = { label: string } & ({ kind: 'own'; item: StaffItem } | { kind: 'link' } | { kind: 'soon' });

// Items of other portals are drawn from the Mockup and never built here (RN-CAL-USR-02): Catálogos and Descuentos
// go to the commercial-reservation area of the container, the rest is disabled.
const ENTRIES: readonly Entry[] = [
  { label: 'Resumen', kind: 'own', item: 'summary' },
  { label: 'Reservas', kind: 'soon' },
  { label: 'Catálogos', kind: 'link' },
  { label: 'Descuentos', kind: 'link' },
  { label: 'Pagos', kind: 'soon' },
  { label: 'Caja', kind: 'soon' },
  { label: 'Operación', kind: 'soon' },
  { label: 'Notificaciones', kind: 'soon' },
  { label: 'Reportes', kind: 'soon' },
  { label: 'Colaboradores', kind: 'own', item: 'staff' },
];

export interface StaffFrameProps {
  current: StaffItem;
  commercialHref: string;
  onNavigate: (item: StaffItem) => void;
  onSignOut: () => void;
  // The collaborator sees the same frame without the administrator's items (the role comes from the account).
  canManageStaff?: boolean;
  onOpenProfile?: () => void;
  children: ReactNode;
}

// Frame shared by the staff views (spec 009 D-01, spec 011): the light sidebar of the Mockup and the content slot.
export function StaffFrame({ current, commercialHref, onNavigate, onSignOut, canManageStaff = true, onOpenProfile, children }: StaffFrameProps) {
  const entries = canManageStaff ? ENTRIES : ENTRIES.filter((entry) => !(entry.kind === 'own' && entry.item === 'staff'));
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <span className="staff-brand">
          MULTI<span>TOUR</span>
        </span>
        <p className="staff-role">{canManageStaff ? text.role : text.collaboratorRole}</p>
        <nav aria-label={text.navLabel}>
          <ul className="staff-nav">
            {entries.map((entry) => (
              <li key={entry.label}>
                {entry.kind === 'own' && (
                  <button type="button" aria-current={current === entry.item ? 'page' : undefined} onClick={() => onNavigate(entry.item)}>
                    {entry.label}
                  </button>
                )}
                {entry.kind === 'link' && <NavLink href={commercialHref}>{entry.label}</NavLink>}
                {entry.kind === 'soon' && (
                  <span aria-disabled="true">
                    {entry.label} <small>{text.soon}</small>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {onOpenProfile && (
          <button type="button" className="staff-signout" onClick={onOpenProfile}>
            {text.profile}
          </button>
        )}
        <button type="button" className="staff-signout" onClick={onSignOut}>
          {text.signOut}
        </button>
      </aside>
      <main className="staff-content">{children}</main>
    </div>
  );
}
