import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from './audit';
import { AuditView } from './AuditView';
import { PlatformFrame } from './PlatformFrame';

const events: AuditEvent[] = [
  { id: 'e1', occurredAt: '2026-10-12T14:32:00Z', action: 'Operador creado', operator: 'Travesía Natural', change: 'Sin estado → Activo', actor: 'admin@multitour.local', reason: 'Alta aprobada por el comité' },
  { id: 'e2', occurredAt: '2026-10-11T09:05:00Z', action: 'Operador inactivado', operator: 'Sierra Azul', change: 'Activo → Inactivo', actor: 'admin@multitour.local', reason: 'Solicitud del operador' },
];

const labels = ['Fecha y hora', 'Acción', 'Operador', 'Cambio', 'Responsable', 'Motivo'];

function show(source: () => Promise<AuditEvent[]>) {
  return render(
    <PlatformFrame current="audit" onNavigate={() => {}} onSignOut={() => {}}>
      <AuditView source={source} />
    </PlatformFrame>,
  );
}

// jsdom has no modal dialog: the stub opens and closes it the way the browser does, close event included.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

describe('platform audit view (spec 008, RN-CAL-AUD-01 to 05)', () => {
  it('U·audit_table_has_its_seven_columns: header, intro and the columns of the Mockup in order', async () => {
    show(async () => events);
    expect(screen.getByRole('heading', { name: 'Auditoría de plataforma', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Trazabilidad transversal')).toBeInTheDocument();
    expect(screen.getByText('Las decisiones sobre operadores dejan evidencia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auditoría' })).toHaveAttribute('aria-current', 'page');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([...labels, 'Detalle']);
    expect(within(table).getAllByRole('button', { name: 'Detalle' })).toHaveLength(2);
    expect(within(table).getByText('Operador creado')).toBeInTheDocument();
  });

  it('U·detail_opens_the_dialog_with_the_event: the dialog shows the event of the row that was clicked', async () => {
    show(async () => events);
    const buttons = await screen.findAllByRole('button', { name: 'Detalle' });
    fireEvent.click(buttons[1]);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    expect(within(dialog).getByText('Evento auditado')).toBeInTheDocument();
    expect(within(dialog).getByText('Sierra Azul')).toBeInTheDocument();
    expect(within(dialog).getByText('Activo → Inactivo')).toBeInTheDocument();
    expect(within(dialog).getByText('Solicitud del operador')).toBeInTheDocument();
  });

  it('U·close_and_escape_return_focus: "Cerrar" and the close event of Escape give the focus back to the row button', async () => {
    show(async () => events);
    const buttons = await screen.findAllByRole('button', { name: 'Detalle' });
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toHaveFocus();

    fireEvent.click(buttons[1]);
    // Escape makes the browser close the dialog itself and fire `close`.
    fireEvent(screen.getByRole('dialog', { name: 'Detalle de auditoría' }), new Event('close'));
    expect(buttons[1]).toHaveFocus();
  });

  it('U·audit_view_shows_only_the_listed_fields: the detail lists the six audit fields and nothing operational', async () => {
    show(async () => events);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Detalle' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Detalle de auditoría' });
    expect(within(dialog).getAllByRole('term').map((t) => t.textContent)).toEqual(labels);
    expect(within(dialog).getAllByRole('definition')).toHaveLength(labels.length);
  });

  it('U·audit_has_four_states: loading, error with a retry, empty and data', async () => {
    let release: (rows: AuditEvent[]) => void = () => {};
    const pending = new Promise<AuditEvent[]>((resolve) => {
      release = resolve;
    });
    const source = vi.fn().mockReturnValueOnce(pending).mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(events);
    const view = show(source);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    await act(async () => release([]));
    expect(await screen.findByText('Aún no hay eventos de auditoría.')).toBeInTheDocument();
    view.unmount();

    const failing = show(source);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(source).toHaveBeenCalledTimes(3);
    failing.unmount();
  });
});
