import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffFrame } from '../ui/StaffFrame';
import type { StaffMember } from './staff';
import { StaffListView } from './StaffListView';

const members: StaffMember[] = [
  { id: 'c1', name: 'Camila Restrepo', email: 'camila@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-10T15:00:00Z' },
  { id: 'c2', name: 'Mateo Rojas', email: 'mateo@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-11T09:30:00Z', active: false },
];

describe('staff team table (spec 009 PT-05, RN-CAL-USR-07)', () => {
  it('U·list_filters_by_state_and_counts: the counter and the Mostrar filter follow the state of each user', async () => {
    render(<StaffListView source={async () => members} onRegister={vi.fn()} onOpen={vi.fn()} />);
    const table = await screen.findByRole('table');
    expect(screen.getByText('1 usuario activo · 1 inactivo')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    const filter = screen.getByLabelText('Mostrar');
    expect([...(filter as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(['Todos', 'Activos', 'Inactivos']);
    fireEvent.change(filter, { target: { value: 'inactive' } });
    expect(within(screen.getByRole('table')).getByText('Mateo Rojas')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Camila Restrepo')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Inactivo')).toBeInTheDocument();
    // The counter totals every registered user, not the filtered rows (decision of PR 42).
    expect(screen.getByText('1 usuario activo · 1 inactivo')).toBeInTheDocument();
    fireEvent.change(filter, { target: { value: 'active' } });
    expect(within(screen.getByRole('table')).getByText('Camila Restrepo')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Mateo Rojas')).not.toBeInTheDocument();
  });

  it('U·filter_without_users_says_so: an empty filter shows the Mockup line and no table', async () => {
    render(<StaffListView source={async () => [members[0]]} onRegister={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'inactive' } });
    expect(screen.getByText('No hay usuarios para el filtro seleccionado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('U·register_button_has_the_accent_contrast: the content of the frame carries the operator tokens', () => {
    const { container } = render(
      <StaffFrame current='staff' commercialHref='/x' onNavigate={vi.fn()} onSignOut={vi.fn()}>
        <p>content</p>
      </StaffFrame>,
    );
    expect(container.querySelector('main')).toHaveClass('operator-content');
  });
});
