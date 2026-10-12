import { AreaCard } from './AreaCard';
import { shellMessages } from './messages';
import { commercialAreaHref } from './roles';
import { TopBar } from './TopBar';
import '../tenants/operator.css';

const text = shellMessages.staff;

// "Control de la operación" (Mockup admin-operador.html): the areas of the operator. Only the ones that have a route in
// this version are links; the rest are shown disabled.
export function StaffHome({ identifier, onSignOut }: { identifier: string; onSignOut: () => void }) {
  const area = commercialAreaHref(identifier);
  const { cards } = text;
  return (
    <div className="shell">
      <TopBar role={text.role} onSignOut={onSignOut} />
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
        </div>
      </main>
    </div>
  );
}
