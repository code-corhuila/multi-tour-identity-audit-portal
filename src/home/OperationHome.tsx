import { AreaCard } from '../shell/AreaCard';
import { visualIdentityMessages } from '../visualIdentity/messages';
import { formatToday } from './formatToday';
import { homeTestData, type HomeData } from './homeTestData';
import { homeMessages as text } from './messages';
import { Metric } from './Metric';
import './home.css';

export interface OperationHomeProps {
  identifier: string;
  commercialHref: string;
  canEditIdentity: boolean;
  onOpenIdentity: () => void;
  onOpenProfile: () => void;
  // Test numbers: absent in the production build, where the home shows dashes (RN-CAL-HOM-02).
  data?: HomeData | null;
}

const defaultData: HomeData | undefined = import.meta.env.DEV ? homeTestData : undefined;

// "Control de la operación" (Mockup admin-operador.html) in the slot of the staff frame. A leaf the router can drop if
// the commercial portal builds the same page (spec 011 D-02).
export function OperationHome({ identifier, commercialHref, canEditIdentity, onOpenIdentity, onOpenProfile, data: given }: OperationHomeProps) {
  const data = given === undefined ? defaultData : given;
  const value = (n: number | string | undefined) => (n === undefined ? text.none : String(n));
  const daily = [data?.createdToday, data?.pendingPayment, data?.confirmed, data?.cancelled, data?.upcoming];
  const pending = [data?.paymentsToValidate, data?.cashTotal];
  const { cards } = text.manage;
  return (
    <div className="home">
      <header className="home-header">
        <div>
          <p className="home-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="home-tenant">
            {text.tenant}: <strong>{identifier}</strong>
          </p>
        </div>
        <div className="home-header-side">
          <p className="home-date">{formatToday()}</p>
          <button type="button" className="home-link" onClick={onOpenProfile}>
            {text.profile}
          </button>
        </div>
      </header>
      <section className="home-hero">
        <p className="home-eyebrow">{text.heroEyebrow}</p>
        <h2>{text.heroTitle}</h2>
        <p>{text.heroCopy}</p>
      </section>
      <p className="home-testdata">{data ? text.testData : text.empty}</p>
      <p className="home-eyebrow">{text.daily.eyebrow}</p>
      <p>{text.daily.copy}</p>
      <div className="home-row" role="group" aria-label={text.daily.title}>
        {text.daily.metrics.map((label, i) => (
          <Metric key={label} label={label} value={value(daily[i])} />
        ))}
      </div>
      <p className="home-eyebrow">{text.pending.eyebrow}</p>
      <div className="home-row" role="group" aria-label={text.pending.title}>
        {text.pending.metrics.map((label, i) => (
          <Metric key={label} label={label} value={value(pending[i])} />
        ))}
      </div>
      <h2 className="home-manage">{text.manage.title}</h2>
      <div className="shell-cards">
        <AreaCard {...cards.reservations} />
        <AreaCard {...cards.discounts} href={commercialHref} />
        <AreaCard {...cards.payments} />
        <AreaCard {...cards.operations} />
        {canEditIdentity && <AreaCard title={visualIdentityMessages.card} body={visualIdentityMessages.cardBody} onSelect={onOpenIdentity} />}
      </div>
    </div>
  );
}
