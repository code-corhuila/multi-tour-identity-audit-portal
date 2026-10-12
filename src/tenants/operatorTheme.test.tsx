import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../contract';
import operatorCss from './operator.css?raw';
import { RegisterTenantScreen } from './RegisterTenantScreen';
import { TenantsApp } from './TenantsApp';

// Tokens of the newer Mockup (main.css of the branch feat/operator-landing-sync: --page-bg, --accent-strong, --cta...).
describe('operator.css', () => {
  it('declares the platform tokens of the newer Mockup on the content area', () => {
    expect(operatorCss).toMatch(/\.operator-content\s*{[^}]*--op-bg:\s*#f5f7f7/);
    expect(operatorCss).toMatch(/\.operator-content\s*{[^}]*--op-line:\s*#d7e0de/);
    expect(operatorCss).toMatch(/\.operator-content\s*{[^}]*--op-accent-strong:\s*#1f4d3d/);
    expect(operatorCss).toMatch(/\.operator-content\s*{[^}]*--op-soft:\s*#5a6b70/);
    expect(operatorCss).toMatch(/\.operator-content\s*{[^}]*background:\s*var\(--op-bg\)/);
  });

  it('styles panel, title, table header and buttons from those tokens', () => {
    expect(operatorCss).toMatch(/\.operator-panel\s*{[^}]*border-radius:\s*16px/);
    expect(operatorCss).toMatch(/\.operator-topbar h1[^{]*{[^}]*"Bricolage Grotesque"/);
    expect(operatorCss).toMatch(/\.operator-table th\s*{[^}]*color:\s*var\(--op-soft\)/);
    expect(operatorCss).toMatch(/\.operator-primary\s*{[^}]*background:\s*var\(--op-accent-strong\)/);
    expect(operatorCss).toMatch(/\.operator-outline\s*{[^}]*border:\s*1px solid var\(--op-line-strong\)/);
    expect(operatorCss).toMatch(/\.operator-panel select[^{]*{[^}]*border-radius:\s*10px/);
  });
});

describe('operator screens use the primary button', () => {
  const admin: Session = { roles: ['PLATFORM_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };

  it('the list action to register a tenant is the primary button', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    render(<TenantsApp apiClient={{ request }} session={admin} />);
    const button = await screen.findByRole('button', { name: 'Registrar operador' });
    expect(button).toHaveClass('operator-primary');
  });

  it('the submit of the register form is the primary button', () => {
    render(<RegisterTenantScreen apiClient={{ request: vi.fn() }} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Registrar operador' })).toHaveClass('operator-primary');
  });
});
