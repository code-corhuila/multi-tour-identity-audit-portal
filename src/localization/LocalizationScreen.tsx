import type { ApiClient, Session } from '../contract';
import { TENANT_ADMINISTRATOR } from '../shell/roles';
import { CurrentValues, LocalizationForm, type Localization } from './LocalizationForm';
import { localizationMessages as text } from './messages';
import { useTenantLocalization } from './useTenantLocalization';
import '../tenants/operator.css';
import './localization.css';

export interface LocalizationScreenProps {
  apiClient: ApiClient;
  session: Session;
  // Called once after a good save, so the container may use the zone to format the dates it shows (spec 018 section 5).
  onLocalizationChange?: (localization: Localization) => void;
  onBack?: () => void;
}

// The Tenant Administrator sees the zone and the country of the company and changes them (portal spec 018). The role check
// hides the screen; the service refuses anyone else anyway (RN-IDA-PT-42). An inactive company is only shown its values:
// the service refuses every change of an inactive one with the same 422 as an open cash, so the form is not offered.
export function LocalizationScreen({ apiClient, session, onLocalizationChange, onBack }: LocalizationScreenProps) {
  if (!session.roles.includes(TENANT_ADMINISTRATOR)) return null;
  return <Body apiClient={apiClient} onLocalizationChange={onLocalizationChange} onBack={onBack} />;
}

function Body({ apiClient, onLocalizationChange, onBack }: Omit<LocalizationScreenProps, 'session'>) {
  const { state, retry } = useTenantLocalization(apiClient);
  return (
    <main className="operator-content">
      <header className="operator-topbar">
        <div>
          <p className="operator-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          {state.kind === 'data' && (
            <p className="localization-company">
              {text.company}: <strong>{state.commercialName}</strong>
            </p>
          )}
        </div>
        {onBack && (
          <button type="button" className="operator-outline" onClick={onBack}>
            {text.back}
          </button>
        )}
      </header>
      {state.kind === 'loading' && <p role="status">{text.loading}</p>}
      {state.kind === 'error' && (
        <section className="operator-panel" role="alert">
          <p>{state.line}</p>
          <button type="button" className="operator-outline" onClick={() => void retry()}>
            {text.retry}
          </button>
        </section>
      )}
      {state.kind === 'data' && state.tenantStatus !== 'ACTIVE' && (
        <section className="operator-panel">
          <CurrentValues timeZone={state.timeZone} country={state.country} />
          <p role="status">{text.inactive}</p>
        </section>
      )}
      {state.kind === 'data' && state.tenantStatus === 'ACTIVE' && (
        <LocalizationForm apiClient={apiClient} current={{ timeZone: state.timeZone, country: state.country }} onChange={onLocalizationChange} />
      )}
    </main>
  );
}
