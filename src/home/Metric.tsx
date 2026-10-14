import { homeMessages as text } from './messages';

export interface MetricProps {
  label: string;
  value: string;
}

// One number of the home. Its ghost link goes to an area of another portal, so it is disabled (spec 009 RN-CAL-USR-02).
export function Metric({ label, value }: MetricProps) {
  return (
    <div className="home-metric" role="group" aria-label={label}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small aria-disabled="true">{text.soon}</small>
    </div>
  );
}
