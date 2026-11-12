import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { ChangeSummary } from './ChangeSummary';
import { countryOptions } from './countries';
import type { LocalizationChange } from './localizationApi';
import { localizationMessages as text } from './messages';
import { timeZoneOptions } from './timeZones';
import { useChangeLocalization } from './useChangeLocalization';

export interface Localization {
  timeZone: string;
  country: string;
}

interface FormProps {
  apiClient: ApiClient;
  current: Localization;
  onChange?: (localization: Localization) => void;
}

const COUNTRIES = countryOptions();
const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;

export function CurrentValues({ timeZone, country }: Localization) {
  return (
    <p className="localization-current">
      <span>{text.currentZone(timeZone)}</span>
      <span>{text.currentCountry(countryName(country))}</span>
    </p>
  );
}

// The Tenant Administrator picks the zone and the country, reviews what changes and confirms (portal spec 018, D-03). The
// choice survives every refusal; the values the service has are the ones of the last good answer.
export function LocalizationForm({ apiClient, current: initial, onChange }: FormProps) {
  const [current, setCurrent] = useState(initial);
  const [zone, setZone] = useState(initial.timeZone);
  const [country, setCountry] = useState(initial.country);
  const [step, setStep] = useState<'form' | 'review'>('form');
  const { sending, failure, saved, submit, reset } = useChangeLocalization(apiClient);
  const messages = useRef<HTMLDivElement>(null);
  const afterConfirm = useRef(false);
  const zones = useMemo(() => {
    const all = timeZoneOptions();
    return all.includes(current.timeZone) ? all : [current.timeZone, ...all];
  }, [current.timeZone]);
  // A country the list does not have (the service may accept a code it lacks) still has its own option.
  const countries = useMemo(
    () => (COUNTRIES.some((c) => c.code === current.country) ? COUNTRIES : [{ code: current.country, name: current.country }, ...COUNTRIES]),
    [current.country],
  );

  // Back on the form after a confirmation, focus goes to the line that says how it ended (the summary that held it is gone).
  useEffect(() => {
    if (step === 'form' && afterConfirm.current) {
      afterConfirm.current = false;
      messages.current?.focus();
    }
  }, [step]);

  const zoneChanged = zone !== current.timeZone;
  const countryChanged = country !== current.country;
  const differs = zoneChanged || countryChanged;

  async function confirm() {
    const body: LocalizationChange = {};
    if (zoneChanged) body.timeZone = zone;
    if (countryChanged) body.country = country;
    const answer = await submit(body);
    afterConfirm.current = true;
    setStep('form');
    if (answer) {
      const next = { timeZone: answer.timeZone, country: answer.country };
      setCurrent(next);
      setZone(next.timeZone);
      setCountry(next.country);
      onChange?.(next);
    }
  }

  if (step === 'review') {
    return (
      <ChangeSummary
        zone={zoneChanged ? { from: current.timeZone, to: zone } : undefined}
        country={countryChanged ? { from: countryName(current.country), to: countryName(country) } : undefined}
        sending={sending}
        onConfirm={() => void confirm()}
        onBack={() => setStep('form')}
      />
    );
  }

  return (
    <form
      className="operator-panel localization-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (differs) setStep('review');
      }}
    >
      <CurrentValues {...current} />
      <div className="auth-field">
        <label htmlFor="localization-zone">{text.zone}</label>
        <div className="auth-input-wrap">
          <select
            id="localization-zone"
            value={zone}
            aria-invalid={failure?.fields.timeZone ? true : undefined}
            aria-describedby={failure?.fields.timeZone ? 'localization-zone-error' : undefined}
            onChange={(e) => {
              setZone(e.target.value);
              reset();
            }}
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        {failure?.fields.timeZone && (
          <p id="localization-zone-error" className="auth-field-error">
            {failure.fields.timeZone}
          </p>
        )}
      </div>
      <div className="auth-field">
        <label htmlFor="localization-country">{text.country}</label>
        <div className="auth-input-wrap">
          <select
            id="localization-country"
            value={country}
            aria-invalid={failure?.fields.country ? true : undefined}
            aria-describedby={failure?.fields.country ? 'localization-country-error' : undefined}
            onChange={(e) => {
              setCountry(e.target.value);
              reset();
            }}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {failure?.fields.country && (
          <p id="localization-country-error" className="auth-field-error">
            {failure.fields.country}
          </p>
        )}
      </div>
      <p className="localization-note">{text.effect}</p>
      {countryChanged && <p className="localization-note">{text.countryNote}</p>}
      <div aria-live="polite" tabIndex={-1} ref={messages} className="localization-messages">
        {failure?.line && <p className="auth-field-error">{failure.line}</p>}
        {saved && <p>{text.saved}</p>}
      </div>
      <div className="localization-actions">
        {failure?.retryable && (
          <button type="button" className="operator-outline" onClick={() => void confirm()} disabled={sending || !differs}>
            {text.retry}
          </button>
        )}
        <button type="submit" className="operator-primary" disabled={!differs}>
          {text.review}
        </button>
      </div>
    </form>
  );
}
