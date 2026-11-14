import { useEffect, useRef } from 'react';
import { localizationMessages as text } from './messages';

export interface Change {
  from: string;
  to: string;
}

// What the person is about to change, and only that (portal spec 018 RN-IDA-PT-45): a line for the zone and one for the country
// when each differs. Nothing is sent until "Confirmar cambio".
export function ChangeSummary({
  zone,
  country,
  sending,
  onConfirm,
  onBack,
}: {
  zone?: Change;
  country?: Change;
  sending: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  // Focus follows the step: the form that held it is gone, so a keyboard or screen-reader person lands on the summary.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="operator-panel localization-summary" aria-label={text.summaryTitle}>
      <h2 ref={heading} tabIndex={-1}>
        {text.summaryTitle}
      </h2>
      <ul>
        {zone && <li>{text.summaryZone(zone.from, zone.to)}</li>}
        {country && <li>{text.summaryCountry(country.from, country.to)}</li>}
      </ul>
      {sending && <p role="status">{text.sending}</p>}
      <div className="localization-actions">
        <button type="button" className="operator-outline" onClick={onBack} disabled={sending}>
          {text.backToForm}
        </button>
        <button type="button" className="operator-primary" onClick={onConfirm} disabled={sending}>
          {text.confirm}
        </button>
      </div>
    </section>
  );
}
