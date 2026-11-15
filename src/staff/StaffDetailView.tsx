import { PageHeader } from '../platform/PageHeader';
import type { StaffSource } from './staff';
import { PermissionsPanel } from './PermissionsPanel';
import { staffMessages } from './messages';
import { useStaffMembers } from './useStaffMembers';
import '../tenants/operator.css';

const t = staffMessages.detail;

export interface StaffDetailViewProps {
  id: string;
  onBack: () => void;
  source?: StaffSource;
}

// Detail of the staff frame (Mockup admin-detalle-colaborador.html): the five fields of one internal user.
export function StaffDetailView({ id, onBack, source }: StaffDetailViewProps) {
  const { state, retry } = useStaffMembers(source);
  const member = state.kind === 'data' ? state.members.find((m) => m.id === id) : undefined;
  return (
    <>
      <PageHeader
        eyebrow={staffMessages.eyebrow}
        title={t.title}
        action={
          <button type="button" className="operator-outline mt-page-header-action" onClick={onBack}>
            {t.back}
          </button>
        }
      />
      {state.kind === 'loading' && <p role="status">{staffMessages.loading}</p>}
      {state.kind === 'error' && (
        <div role="alert">
          <p>{staffMessages.error}</p>
          <button type="button" className="operator-outline" onClick={retry}>
            {staffMessages.retry}
          </button>
        </div>
      )}
      {state.kind === 'data' && !member && <p className="operator-access-note">{t.notFound}</p>}
      {member && (
        <section className="operator-panel">
          <p className="operator-eyebrow">{t.eyebrow}</p>
          <h2>{member.name}</h2>
          <dl className="operator-detail-list">
            {(
              [
                [t.name, member.name],
                [t.email, member.email],
                [t.role, member.role],
                [t.tenant, member.tenant],
                [t.createdAt, member.createdAt.slice(0, 10)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {member && <PermissionsPanel key={member.id} memberId={member.id} role={member.role} />}
    </>
  );
}
