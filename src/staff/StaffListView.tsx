import { useState } from 'react';
import { PageHeader } from '../platform/PageHeader';
import type { StaffSource } from './staff';
import { staffMessages } from './messages';
import { useStaffMembers } from './useStaffMembers';
import '../tenants/operator.css';

const t = staffMessages.list;

// Permission of HU-SEC-006: the service does not exist, so the toggle only flips local state (RN-CAL-USR-04, plan D-03).
function TransferValidationPanel() {
  const [enabled, setEnabled] = useState(false);
  return (
    <section className="operator-panel">
      <div className="operator-panel-head">
        <div>
          <p className="operator-eyebrow">{t.permissionsEyebrow}</p>
          <h2>{t.permissionsTitle}</h2>
        </div>
        <span className="operator-status">{enabled ? t.enabled : t.disabled}</span>
      </div>
      <p className="operator-copy">{t.permissionsCopy}</p>
      <button type="button" className="operator-outline" onClick={() => setEnabled(!enabled)}>
        {enabled ? t.disable : t.enable}
      </button>
    </section>
  );
}

export interface StaffListViewProps {
  onRegister: () => void;
  onOpen: (id: string) => void;
  source?: StaffSource;
}

// List of the staff frame (Mockup admin-colaboradores.html): header, band, team table and the permissions panel.
export function StaffListView({ onRegister, onOpen, source }: StaffListViewProps) {
  const { state, retry } = useStaffMembers(source);
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
          <div className="operator-table-wrap">
            <table className="operator-table">
              <thead>
                <tr>
                  <th>{t.columns.name}</th>
                  <th>{t.columns.email}</th>
                  <th>{t.columns.role}</th>
                  <th>{t.columns.action}</th>
                </tr>
              </thead>
              <tbody>
                {state.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
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
      <TransferValidationPanel />
    </>
  );
}
