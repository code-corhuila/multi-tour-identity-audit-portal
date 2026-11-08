import { useState } from 'react';
import type { ApiClient, MountProps, Session } from '../contract';
import { ProfileScreen } from '../profile/ProfileScreen';
import { VisualIdentityScreen } from '../visualIdentity/VisualIdentityScreen';
import { OperationHome } from '../home/OperationHome';
import { StaffDetailView } from '../staff/StaffDetailView';
import { StaffListView } from '../staff/StaffListView';
import { RegisterStaffView } from '../staff/RegisterStaffView';
import { TenantAuditView } from '../tenantAudit/TenantAuditView';
import { StaffFrame, type StaffItem } from '../ui/StaffFrame';
import { shellMessages } from './messages';
import { canReadTenantAudit, commercialAreaHref, TENANT_ADMINISTRATOR } from './roles';
import { TopBar } from './TopBar';
import '../tenants/operator.css';

const text = shellMessages.staff;

export interface StaffHomeProps extends Pick<MountProps, 'commercialName' | 'visualIdentity' | 'onVisualIdentityChange'> {
  identifier: string;
  session: Session;
  apiClient: ApiClient;
  onSignOut: () => void;
}

// "Control de la operación" (Mockup admin-operador.html): the areas of the operator. Only the ones that have a route in
// this version are links; the rest are shown disabled. The Tenant Administrator also gets the visual identity card, which
// opens its screen inside this same panel (portal spec 005, PT-09).
export function StaffHome({ identifier, session, apiClient, commercialName, visualIdentity, onVisualIdentityChange, onSignOut }: StaffHomeProps) {
  const [view, setView] = useState<'home' | 'identity' | 'profile' | 'staff' | 'staff-detail' | 'staff-register' | 'audit'>('home');
  const [memberId, setMemberId] = useState('');
  const area = commercialAreaHref(identifier);
  const canEditIdentity = session.roles.includes(TENANT_ADMINISTRATOR);
  // The collaborators are managed by the Tenant Administrator; the other staff roles get the frame without that item.
  const canManageStaff = canEditIdentity;
  const canReadAudit = canReadTenantAudit(session.roles);
  const go = (item: StaffItem) => setView(item === 'staff' && canManageStaff ? 'staff' : item === 'audit' && canReadAudit ? 'audit' : 'home');

  if (view === 'profile') {
    return <ProfileScreen session={session} backLabel="Volver al panel" onBack={() => setView('home')} onSignOut={onSignOut} />;
  }

  if (view === 'identity' && canEditIdentity) {
    return (
      <div className="shell">
        <TopBar role={text.role} onSignOut={onSignOut} />
        <VisualIdentityScreen
          apiClient={apiClient}
          session={session}
          commercialName={commercialName}
          visualIdentity={visualIdentity}
          onVisualIdentityChange={onVisualIdentityChange}
          onBack={() => setView('home')}
        />
      </div>
    );
  }

  const onStaffView = canManageStaff && view.startsWith('staff');
  const onAudit = view === 'audit' && canReadAudit;
  return (
    <StaffFrame
      current={onStaffView ? 'staff' : onAudit ? 'audit' : 'summary'}
      commercialHref={area}
      canManageStaff={canManageStaff}
      canReadAudit={canReadAudit}
      onNavigate={go}
      onOpenProfile={() => setView('profile')}
      onSignOut={onSignOut}
    >
      {onStaffView && view === 'staff' && (
        <StaffListView
          apiClient={apiClient}
          onRegister={() => setView('staff-register')}
          onOpen={(id) => {
            setMemberId(id);
            setView('staff-detail');
          }}
        />
      )}
      {onStaffView && view === 'staff-detail' && <StaffDetailView id={memberId} onBack={() => setView('staff')} />}
      {onStaffView && view === 'staff-register' && <RegisterStaffView tenantName={commercialName ?? identifier} onBack={() => setView('staff')} />}
      {onAudit && <TenantAuditView apiClient={apiClient} administrator={canEditIdentity} />}
      {!onStaffView && !onAudit && <OperationHome
        identifier={identifier}
        commercialHref={area}
        canEditIdentity={canEditIdentity}
        onOpenIdentity={() => setView('identity')}
        onOpenProfile={() => setView('profile')}
      />}
    </StaffFrame>
  );
}
