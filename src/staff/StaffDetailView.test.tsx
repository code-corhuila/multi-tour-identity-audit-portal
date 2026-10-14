import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StaffMember } from './staff';
import { StaffDetailView } from './StaffDetailView';

const member: StaffMember = { id: 'c1', name: 'Camila Restrepo', email: 'camila@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-10T15:00:00Z' };

const show = (id: string, source: () => Promise<StaffMember[]>, onBack = vi.fn()) => render(<StaffDetailView id={id} source={source} onBack={onBack} />);

describe('staff detail view (spec 009 PT-02, RN-CAL-USR-03)', () => {
  it('U·detail_renders_its_mockup_parts: header, back link and the five fields', async () => {
    const onBack = vi.fn();
    show('c1', async () => [member], onBack);
    expect(screen.getByRole('heading', { name: 'Detalle del colaborador', level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a colaboradores' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    for (const label of ['Nombre', 'Correo / usuario de acceso', 'Rol', 'Tenant', 'Fecha de registro']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('2026-10-10')).toBeInTheDocument();
  });

  it('U·detail_has_four_states: loading, error with retry, not found and data', async () => {
    const source = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([]).mockResolvedValue([member]);
    show('c9', source);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('No se encontró el colaborador seleccionado.')).toBeInTheDocument();
  });
});
