import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffFrame } from './StaffFrame';

const COMMERCIAL = '/t/travesia-natural/areas/commercial-reservation-portal';

const frame = (current: 'summary' | 'staff' = 'staff', onSignOut = vi.fn(), onNavigate = vi.fn()) =>
  render(
    <StaffFrame current={current} commercialHref={COMMERCIAL} onNavigate={onNavigate} onSignOut={onSignOut}>
      <p>content</p>
    </StaffFrame>,
  );

describe('staff frame (RN-CAL-USR-01, RN-CAL-USR-02)', () => {
  it('U·staff_frame_has_label_items_and_sign_out: wordmark, role label, the nine items and the sign-out at the bottom', () => {
    const onSignOut = vi.fn();
    const { container } = frame('staff', onSignOut);
    const sidebar = container.querySelector('aside') as HTMLElement;
    expect(within(sidebar).getByText('MULTI').parentElement).toHaveTextContent('MULTITOUR');
    expect(within(sidebar).getByText('Administrador del operador')).toBeInTheDocument();
    const nav = within(sidebar).getByRole('navigation', { name: 'Navegación del operador' });
    const labels = [...nav.querySelectorAll('li')].map((li) => (li.textContent ?? '').replace('Próximamente', '').trim());
    expect(labels).toEqual([
      'Resumen',
      'Reservas',
      'Catálogos',
      'Descuentos',
      'Pagos',
      'Caja',
      'Operación',
      'Reportes',
      'Colaboradores',
    ]);
    const signOut = within(sidebar).getByRole('button', { name: 'Cerrar sesión' });
    expect(sidebar.lastElementChild).toBe(signOut);
    expect(nav.contains(signOut)).toBe(false);
    fireEvent.click(signOut);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('U·current_item_is_marked: only the open item is aria-current and the own items navigate', () => {
    const onNavigate = vi.fn();
    frame('staff', vi.fn(), onNavigate);
    expect(screen.getByRole('button', { name: 'Colaboradores' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Resumen' })).not.toHaveAttribute('aria-current');
    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }));
    expect(onNavigate).toHaveBeenCalledWith('summary');
    fireEvent.click(screen.getByRole('button', { name: 'Colaboradores' }));
    expect(onNavigate).toHaveBeenCalledWith('staff');
  });

  it('U·foreign_items_are_links_or_disabled_never_pages: Catálogos and Descuentos link out, the rest is disabled', () => {
    const onNavigate = vi.fn();
    frame('summary', vi.fn(), onNavigate);
    expect(screen.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('href', COMMERCIAL);
    expect(screen.getByRole('link', { name: 'Descuentos' })).toHaveAttribute('href', COMMERCIAL);
    for (const name of ['Reservas', 'Pagos', 'Caja', 'Operación', 'Reportes']) {
      const item = screen.getByText(name).closest('[aria-disabled]') as HTMLElement;
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(within(item).getByText('Próximamente')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      fireEvent.click(item);
    }
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
