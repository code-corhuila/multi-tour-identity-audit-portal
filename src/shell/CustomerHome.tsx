import { AreaCard } from './AreaCard';
import { shellMessages } from './messages';
import { commercialAreaHref } from './roles';
import { TopBar } from './TopBar';
import '../tenants/operator.css';

const text = shellMessages.customer;

// Minimal client panel (Mockup panel-cliente.html). The session carries no name, so the greeting is generic.
export function CustomerHome({ identifier, onSignOut }: { identifier: string; onSignOut: () => void }) {
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
          <AreaCard {...text.profile} />
        </div>
      </main>
    </div>
  );
}
