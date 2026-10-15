import { useState, type FormEvent } from 'react';
import { staffMessages } from './messages';

const t = staffMessages.regional;

interface Change {
  at: string;
  field: string;
  before: string;
  after: string;
  reason: string;
}

// Country and time zone of the tenant with its audit table (Mockup admin-colaboradores.html). The change is
// prospective and visual only: nothing is sent, the audit rows live in local state.
export function RegionalSettingsPanel() {
  const [country, setCountry] = useState('CO');
  const [zone, setZone] = useState('America/Bogota');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Change[]>([]);
  const [saved, setSaved] = useState({ country: 'CO', zone: 'America/Bogota' });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setError(t.reasonRequired);
      return;
    }
    const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const rows: Change[] = [];
    if (country !== saved.country) rows.push({ at, field: t.fieldCountry, before: saved.country, after: country, reason: reason.trim() });
    if (zone !== saved.zone) rows.push({ at, field: t.fieldZone, before: saved.zone, after: zone, reason: reason.trim() });
    if (rows.length === 0) {
      setError(t.unchanged);
      return;
    }
    setHistory([...rows, ...history]);
    setSaved({ country, zone });
    setReason('');
    setError('');
  }

  return (
    <section className="operator-panel" aria-labelledby="regional-title">
      <p className="operator-eyebrow">{t.eyebrow}</p>
      <h2 id="regional-title">{t.title}</h2>
      <p className="operator-copy">{t.copy}</p>
      <form className="operator-inline-form" onSubmit={onSubmit} noValidate>
        <div className="operator-form-grid">
          <label>
            {t.country}
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {t.countries.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.zone}
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {t.zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label className="operator-form-wide">
            {t.reason}
            <input type="text" value={reason} placeholder={t.reasonPlaceholder} aria-describedby="regional-feedback" onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <p id="regional-feedback" className="operator-form-feedback" aria-live="polite">
          {error}
        </p>
        <div className="operator-form-actions">
          <button type="submit" className="operator-primary">
            {t.save}
          </button>
        </div>
      </form>
      <div className="operator-table-wrap">
        <table className="operator-table" aria-label={t.auditLabel}>
          <thead>
            <tr>
              {t.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={t.columns.length}>{t.auditEmpty}</td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i}>
                  <td>{h.at}</td>
                  <td>{h.field}</td>
                  <td>{h.before}</td>
                  <td>{h.after}</td>
                  <td>{t.actor}</td>
                  <td>{h.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
