import { useState } from 'react';
import type { Session } from '../contract';
import { ProfileScreen } from '../profile/ProfileScreen';
import { AreaCard } from './AreaCard';
import { shellMessages } from './messages';
import { commercialAreaHref } from './roles';
import { TopBar } from './TopBar';
import '../tenants/operator.css';

const text = shellMessages.customer;

export interface CustomerHomeProps {
  identifier: string;
  session: Session;
  onSignOut: () => void;
}

// Minimal client panel (Mockup panel-cliente.html). The greeting is generic: the name lives in "Mi perfil".
export function CustomerHome({ identifier, session, onSignOut }: CustomerHomeProps) {
  const [view, setView] = useState<'home' | 'profile'>('home');
  if (view === 'profile') {
    return <ProfileScreen session={session} backLabel="Volver al panel cliente" onBack={() => setView('home')} onSignOut={onSignOut} />;
  }
  return (
    <div className="shell">
      <TopBar role={text.role} onSignOut={onSignOut} />
      <main className="operator-content">
        <header className="operator-topbar">
          <div>
            <p className="operator-eyebrow">{text.eyebrow}</p>
            <h1>{text.greeting}</h1>
          </div>
        </header>
        <p className="shell-intro">{text.body}</p>
        <div className="shell-cards">
          <AreaCard {...text.reservations} href={commercialAreaHref(identifier)} />
          <AreaCard {...text.profile} onSelect={() => setView('profile')} />
        </div>
      </main>
    </div>
  );
}
