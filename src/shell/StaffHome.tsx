import { useState } from 'react';
import type { ApiClient, MountProps, Session } from '../contract';
import { ProfileScreen } from '../profile/ProfileScreen';
import { VisualIdentityScreen } from '../visualIdentity/VisualIdentityScreen';
import { OperationHome } from '../home/OperationHome';
import { StaffFrame } from '../ui/StaffFrame';
import { shellMessages } from './messages';
import { commercialAreaHref, TENANT_ADMINISTRATOR } from './roles';
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
  const [view, setView] = useState<'home' | 'identity' | 'profile'>('home');
  const area = commercialAreaHref(identifier);
  const canEditIdentity = session.roles.includes(TENANT_ADMINISTRATOR);

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

  // The frame has no routes of its own yet: Colaboradores is wired by the staff users views (portal spec 009).
  return (
    <StaffFrame current="summary" commercialHref={area} onNavigate={() => undefined} onSignOut={onSignOut}>
      <OperationHome
        identifier={identifier}
        commercialHref={area}
        canEditIdentity={canEditIdentity}
        onOpenIdentity={() => setView('identity')}
        onOpenProfile={() => setView('profile')}
      />
    </StaffFrame>
  );
}
