import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FirstPasswordScreen } from '../auth/FirstPasswordScreen';
import { RegisterScreen } from '../auth/RegisterScreen';
import { SignInScreen } from '../auth/SignInScreen';
import type { Session } from '../contract';
import themeCss from './theme.css?raw';

const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
const apiClient = { request: vi.fn() };

// Spec 006 PT-01: entry motion, hover transitions and the "no company field" rule of the calque of the Mockup.
describe('calque of the Mockup: motion (RN-CAL-IDN-06)', () => {
  it('reduced_motion_removes_animation: every animation and every transition is switched off', () => {
    const block = themeCss.match(/@media \(prefers-reduced-motion: reduce\)\s*{[^@]*}\s*}/)?.[0] ?? '';
    expect(block).toMatch(/\.auth-shell \*/);
    expect(block).toMatch(/animation:\s*none\s*!important/);
    expect(block).toMatch(/transition:\s*none\s*!important/);
  });

  it('hover_and_focus_use_a_140ms_transition_of_background_colour_and_border', () => {
    expect(themeCss).toMatch(/\.auth-submit[^{]*{[^}]*transition:[^;}]*background-color 140ms[^;}]*color 140ms[^;}]*border-color 140ms/);
  });

  it('entry_parts_are_staggered_60_110_160_and_210ms', () => {
    expect(themeCss).toMatch(/\.auth-copy \.auth-kicker\s*{[^}]*mthFadeUp 420ms[^}]*60ms/);
    expect(themeCss).toMatch(/\.auth-copy h1\s*{[^}]*mthFadeUp 420ms[^}]*110ms/);
    expect(themeCss).toMatch(/\.auth-copy p:not\(\.auth-kicker\)\s*{[^}]*mthFadeUp 420ms[^}]*160ms/);
    expect(themeCss).toMatch(/\.auth-form\s*{[^}]*mthFadeUp 480ms[^}]*210ms/);
  });
});

describe('calque of the Mockup: no company field (RN-CAL-IDN-01)', () => {
  const companyField = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('input')).filter((i) => /empresa|company|tenant|organization/i.test(`${i.id} ${i.name} ${i.autocomplete} ${i.placeholder}`));

  it('no_view_has_a_company_field: the sign-in of a company, the platform sign-in, the sign-up and the first password', () => {
    const views = [
      <SignInScreen key="a" identifier="acme" apiClient={apiClient} session={session} />,
      <SignInScreen key="b" apiClient={apiClient} session={session} />,
      <RegisterScreen key="c" identifier="acme" apiClient={apiClient} onDone={vi.fn()} onSignIn={vi.fn()} />,
      <FirstPasswordScreen key="d" apiClient={apiClient} session={session} onSaved={vi.fn()} />,
    ];
    for (const view of views) {
      const { container, unmount } = render(view);
      expect(companyField(container)).toHaveLength(0);
      unmount();
    }
  });
});
