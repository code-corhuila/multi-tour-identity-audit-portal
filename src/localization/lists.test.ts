import { describe, expect, it } from 'vitest';
import { countryOptions } from './countries';
import { timeZoneOptions } from './timeZones';

describe('the lists of the screen (portal spec 018, RN-IDA-PT-44)', () => {
  it('U·only_existing_zones_are_offered: the zones the platform knows, each once, with the ones of the first tenants', () => {
    const zones = timeZoneOptions();

    expect(zones).toContain('America/Bogota');
    expect(zones).toContain('America/Mexico_City');
    expect(new Set(zones).size).toBe(zones.length);
    expect(zones.length).toBeGreaterThan(300);
    for (const zone of zones) expect(() => new Intl.DateTimeFormat('en', { timeZone: zone })).not.toThrow();
  });

  it('U·only_countries_of_the_iso_list_are_offered: a code each, its name in Spanish, sorted by name', () => {
    const countries = countryOptions();
    const codes = countries.map((c) => c.code);

    expect(codes).toContain('CO');
    expect(countries.find((c) => c.code === 'CO')?.name).toBe('Colombia');
    expect(countries.find((c) => c.code === 'MX')?.name).toBe('México');
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toHaveLength(249);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
    const names = countries.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });
});
