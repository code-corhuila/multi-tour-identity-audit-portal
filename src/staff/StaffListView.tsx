import { useState } from 'react';
import { PageHeader } from '../platform/PageHeader';
import type { StaffMember, StaffSource } from './staff';
import { staffMessages } from './messages';
import { useStaffMembers } from './useStaffMembers';
import '../tenants/operator.css';

const t = staffMessages.list;

// The special permissions are assigned per user from the detail (RN-CAL-USR-08); this panel only explains them.
function PermissionsExplained() {
  return (
    <section className="operator-panel">
      <p className="operator-eyebrow">{t.permissionsEyebrow}</p>
      <h2>{t.permissionsTitle}</h2>
      <p className="operator-copy">{t.permissionsCopy}</p>
    </section>
  );
}

type Show = 'all' | 'active' | 'inactive';

const isActive = (member: StaffMember) => member.active !== false;
const visible = (members: StaffMember[], show: Show) =>
  members.filter((m) => show === 'all' || (show === 'active' ? isActive(m) : !isActive(m)));

export interface StaffListViewProps {
  onRegister: () => void;
  onOpen: (id: string) => void;
  source?: StaffSource;
}

// List of the staff frame (Mockup admin-colaboradores.html): header, band, team table and the permissions panel.
export function StaffListView({ onRegister, onOpen, source }: StaffListViewProps) {
  const { state, retry } = useStaffMembers(source);
  const [show, setShow] = useState<Show>('all');
  return (
    <>
      <PageHeader
        eyebrow={staffMessages.eyebrow}
        title={t.title}
        action={
          <button type="button" className="operator-primary mt-page-header-action" onClick={onRegister}>
            {t.register}
          </button>
        }
      />
      <section className="operator-panel">
        <p className="operator-eyebrow">{t.bandEyebrow}</p>
        <h2>{t.bandTitle}</h2>
        <p className="operator-copy">{t.bandCopy}</p>
      </section>
      <section className="operator-panel">
        <div className="operator-panel-head">
          <div>
            <p className="operator-eyebrow">{t.panelEyebrow}</p>
            <h2>{t.panelTitle}</h2>
          </div>
          {state.kind === 'data' && state.members.length > 0 && (
            <span className="operator-status" role="status">
              {t.summary(state.members.filter(isActive).length, state.members.filter((m) => !isActive(m)).length)}
            </span>
          )}
        </div>
        {state.kind === 'loading' && <p role="status">{staffMessages.loading}</p>}
        {state.kind === 'error' && (
          <div role="alert">
            <p>{staffMessages.error}</p>
            <button type="button" className="operator-outline" onClick={retry}>
              {staffMessages.retry}
            </button>
          </div>
        )}
        {state.kind === 'data' && state.members.length === 0 && <p className="operator-copy">{t.empty}</p>}
        {state.kind === 'data' && state.members.length > 0 && (
          <label className="operator-table-filter">
            <span>{t.filter}</span>
            <select value={show} onChange={(e) => setShow(e.target.value as Show)}>
              <option value="all">{t.filterOptions.all}</option>
              <option value="active">{t.filterOptions.active}</option>
              <option value="inactive">{t.filterOptions.inactive}</option>
            </select>
          </label>
        )}
        {state.kind === 'data' && state.members.length > 0 && visible(state.members, show).length === 0 && (
          <p className="operator-copy">{t.emptyFilter}</p>
        )}
        {state.kind === 'data' && visible(state.members, show).length > 0 && (
          <div className="operator-table-wrap">
            <table className="operator-table">
              <thead>
                <tr>
                  <th>{t.columns.name}</th>
                  <th>{t.columns.email}</th>
                  <th>{t.columns.role}</th>
                  <th>{t.columns.status}</th>
                  <th>{t.columns.action}</th>
                </tr>
              </thead>
              <tbody>
                {visible(state.members, show).map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
                    <td>
                      <span className={isActive(member) ? 'operator-status is-active' : 'operator-status is-inactive'}>
                        {isActive(member) ? t.statusActive : t.statusInactive}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="operator-outline" onClick={() => onOpen(member.id)}>
                        {t.open}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <PermissionsExplained />
    </>
  );
}
