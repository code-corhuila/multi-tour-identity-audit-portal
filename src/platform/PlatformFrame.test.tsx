import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import platformCss from './platform.css?raw';
import { PageHeader } from './PageHeader';
import { PlatformFrame } from './PlatformFrame';

const frame = (current: 'summary' | 'operators' | 'audit' = 'summary', onSignOut = vi.fn(), onNavigate = vi.fn()) =>
  render(
    <PlatformFrame current={current} onNavigate={onNavigate} onSignOut={onSignOut}>
      <p>content</p>
    </PlatformFrame>,
  );

describe('platform frame (RN-CAL-PLT-01, RN-CAL-PLT-02)', () => {
  it('U·frame_has_brand_role_nav_and_sign_out: brand, role, three items and the sign-out at the bottom', () => {
    const onSignOut = vi.fn();
    const { container } = frame('summary', onSignOut);
    const sidebar = container.querySelector('aside') as HTMLElement;
    expect(within(sidebar).getByText('MULTI').parentElement).toHaveTextContent('MULTITOUR');
    expect(within(sidebar).getByText('Administrador de plataforma')).toBeInTheDocument();
    const nav = within(sidebar).getByRole('navigation', { name: 'Navegación de plataforma' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Resumen', 'Operadores', 'Auditoría']);
    const signOut = within(sidebar).getByRole('button', { name: 'Cerrar sesión' });
    expect(sidebar.lastElementChild).toBe(signOut);
    expect(nav.contains(signOut)).toBe(false);
    fireEvent.click(signOut);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('U·current_item_is_marked: only the open view is aria-current and the items navigate', () => {
    const onNavigate = vi.fn();
    frame('operators', vi.fn(), onNavigate);
    expect(screen.getByRole('button', { name: 'Operadores' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Resumen' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Auditoría' })).not.toHaveAttribute('aria-current');
    fireEvent.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(onNavigate).toHaveBeenCalledWith('audit');
  });

  it('U·create_is_a_header_button_not_a_menu_item: the action lives in the page header, never in the navigation', () => {
    render(
      <PlatformFrame current="summary" onNavigate={vi.fn()} onSignOut={vi.fn()}>
        <PageHeader eyebrow="Control de plataforma" title="Operadores bajo control" action={<button type="button">Crear operador</button>} />
      </PlatformFrame>,
    );
    const header = screen.getByRole('heading', { name: 'Operadores bajo control' }).closest('header') as HTMLElement;
    expect(within(header).getByText('Control de plataforma')).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Crear operador' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegación de plataforma' });
    expect(within(nav).queryByText('Crear operador')).not.toBeInTheDocument();
  });

  it('U·page_header_without_action_renders_only_eyebrow_and_title', () => {
    render(<PageHeader eyebrow="Alta administrativa" title="Crear operador" />);
    expect(screen.getByRole('heading', { name: 'Crear operador' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('platform.css carries the values of the Mockup (spec 007 section 4)', () => {
  it('has the shell grid, the dark sidebar, the accent and the pills', () => {
    expect(platformCss).toMatch(/grid-template-columns:\s*264px/);
    expect(platformCss).toMatch(/linear-gradient\(190deg,\s*#12251f,\s*#0c1a16\)/);
    expect(platformCss).toMatch(/#e9a23b/);
    expect(platformCss).toMatch(/\.platform-signout\s*{[^}]*margin-top:\s*auto/);
    expect(platformCss).toMatch(/padding:\s*44px clamp\(24px, 5vw, 76px\) 70px/);
    expect(platformCss).toMatch(/#ddf0e7/);
    expect(platformCss).toMatch(/#f5e7df/);
  });
});
