import { auditMessages as text } from './auditMessages';

// What the person chose to narrow the audit; an empty text is "all" (spec 014 section 3, plan D-06).
export interface AuditFilterValues {
  action: string;
  tenantId: string;
  // A day as the date control gives it, YYYY-MM-DD; the screen reads it as a day in UTC.
  fromDay: string;
  toDay: string;
}

export const NO_FILTERS: AuditFilterValues = { action: '', tenantId: '', fromDay: '', toDay: '' };

interface Props {
  values: AuditFilterValues;
  onChange: (next: Partial<AuditFilterValues>) => void;
  // Identifier to commercial name of the operators the screen knows (PA-03); they are the options of the operator filter.
  // The screen of one tenant passes none and has no operator filter (spec 015).
  operators?: ReadonlyMap<string, string>;
  invalidPeriod: boolean;
}

const t = text.filters;
const PERIOD_ERROR = 'audit-filter-period-error';

export function AuditFilters({ values, onChange, operators, invalidPeriod }: Props) {
  const byName = operators ? [...operators].sort((a, b) => a[1].localeCompare(b[1], 'es')) : [];
  return (
    <div className="platform-filters" role="group" aria-label={t.group}>
      <div className="platform-field">
        <label htmlFor="audit-filter-action">{t.action}</label>
        <select id="audit-filter-action" value={values.action} onChange={(e) => onChange({ action: e.target.value })}>
          <option value="">{t.allActions}</option>
          {Object.entries(text.actions).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {operators && (
        <div className="platform-field">
          <label htmlFor="audit-filter-operator">{t.operator}</label>
          <select id="audit-filter-operator" value={values.tenantId} onChange={(e) => onChange({ tenantId: e.target.value })}>
            <option value="">{t.allOperators}</option>
            {byName.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="platform-field">
        <label htmlFor="audit-filter-from">{t.from}</label>
        <input id="audit-filter-from" type="date" value={values.fromDay} onChange={(e) => onChange({ fromDay: e.target.value })} />
      </div>
      <div className="platform-field">
        <label htmlFor="audit-filter-to">{t.to}</label>
        <input
          id="audit-filter-to"
          type="date"
          value={values.toDay}
          aria-invalid={invalidPeriod || undefined}
          aria-describedby={invalidPeriod ? PERIOD_ERROR : undefined}
          onChange={(e) => onChange({ toDay: e.target.value })}
        />
        {invalidPeriod && (
          <p id={PERIOD_ERROR} className="platform-field-error" role="alert">
            {t.invalidPeriod}
          </p>
        )}
      </div>
    </div>
  );
}
