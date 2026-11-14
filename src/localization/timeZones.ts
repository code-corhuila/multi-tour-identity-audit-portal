// The time zones the browser knows by their IANA names, the ones the service accepts (RN-IDA-API-101). `supportedValuesOf`
// leaves out `UTC` in some engines, so it is added.
export function timeZoneOptions(): string[] {
  const zones = Intl.supportedValuesOf('timeZone');
  return zones.includes('UTC') ? zones : [...zones, 'UTC'];
}
