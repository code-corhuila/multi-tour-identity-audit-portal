import { useState } from 'react';
import type { ApiClient, MountProps, Session } from '../contract';
import { profileMessages } from '../profile/messages';
import { ProfileScreen } from '../profile/ProfileScreen';
import { VisualIdentityScreen } from '../visualIdentity/VisualIdentityScreen';
import { visualIdentityMessages } from '../visualIdentity/messages';
import { AreaCard } from './AreaCard';
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
  const { cards } = text;
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

  const profileLink = (
    <button type="button" className="shell-nav-item" onClick={() => setView('profile')}>
      {profileMessages.title}
    </button>
  );
  return (
    <div className="shell">
      <TopBar role={text.role} nav={profileLink} onSignOut={onSignOut} />
      <main className="operator-content">
        <header className="operator-topbar">
          <div>
            <p className="operator-eyebrow">{text.eyebrow}</p>
            <h1>{text.title}</h1>
          </div>
          <p className="shell-tenant">
            {text.tenant}: <strong>{identifier}</strong>
          </p>
        </header>
        <p className="shell-intro">{text.intro}</p>
        <div className="shell-cards">
          <AreaCard {...cards.cash} />
          <AreaCard {...cards.catalogs} href={area} />
          <AreaCard {...cards.collaborators} />
          <AreaCard {...cards.discounts} href={area} />
          <AreaCard {...cards.operations} />
          <AreaCard {...cards.payments} />
          {canEditIdentity && (
            <AreaCard title={visualIdentityMessages.card} body={visualIdentityMessages.cardBody} onSelect={() => setView('identity')} />
          )}
        </div>
      </main>
    </div>
  );
}
