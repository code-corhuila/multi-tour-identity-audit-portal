import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationHome } from './OperationHome';
import { formatToday } from './formatToday';
import { homeTestData } from './homeTestData';

afterEach(() => vi.useRealTimers());

const props = { identifier: 'sierra-azul', commercialHref: '/t/sierra-azul/areas/commercial-reservation-portal', canEditIdentity: true, onOpenIdentity: vi.fn(), onOpenProfile: vi.fn() };

describe('staff home Control de la operación (spec 011, RN-CAL-HOM-01 to 05)', () => {
  it('U·home_renders_its_mockup_parts: header, hero, the two metric groups and the four cards, in order', () => {
    render(<OperationHome {...props} data={homeTestData} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Control de la operación' })).toBeInTheDocument();
    expect(screen.getByText('Vista diaria')).toBeInTheDocument();
    expect(screen.getByText('Decisiones comerciales y operativas en un solo lugar.')).toBeInTheDocument();
    const daily = screen.getByRole('group', { name: 'Resumen diario' });
    expect(within(daily).getAllByRole('group')).toHaveLength(5);
    for (const label of ['Reservas creadas hoy', 'Reservas pendientes de pago', 'Reservas confirmadas', 'Reservas canceladas', 'Tours o servicios próximos a ejecutar']) {
      expect(within(daily).getByText(label)).toBeInTheDocument();
    }
    const pending = screen.getByRole('group', { name: 'Pendientes operativos' });
    expect(within(pending).getAllByRole('group')).toHaveLength(2);
    expect(within(pending).getByText('Pagos y soportes por validar')).toBeInTheDocument();
    expect(within(pending).getByText('Total operativo de caja')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Qué necesitas gestionar?' })).toBeInTheDocument();
    for (const card of ['Reservas y clientes', 'Descuentos y condiciones', 'Pagos y devoluciones', 'Ejecución y costos']) {
      expect(screen.getByText(card)).toBeInTheDocument();
    }
  });

  it('U·home_uses_the_mockup_copy: the hero sentence and the captions of the two metric sections', () => {
    render(<OperationHome {...props} data={homeTestData} />);
    expect(screen.getByText('Gestiona únicamente la información de tu operador: reservas, catálogo, descuentos, pagos, caja y ejecución.')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento de reservas y ejecución')).toBeInTheDocument();
    expect(screen.getByText('Indicadores obligatorios para priorizar la operación del día.')).toBeInTheDocument();
    expect(screen.getByText('Validaciones y control de caja')).toBeInTheDocument();
  });

  it('U·metrics_are_labelled_test_data: with data, every group says so; the cards of other portals are disabled', () => {
    render(<OperationHome {...props} data={homeTestData} />);
    expect(screen.getAllByText('Datos de prueba').length).toBeGreaterThan(0);
    expect(screen.getByText(String(homeTestData.createdToday))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descuentos y condiciones/ })).toHaveAttribute('href', props.commercialHref);
    const payments = screen.getByRole('group', { name: 'Pagos y devoluciones' });
    expect(payments).toHaveAttribute('aria-disabled', 'true');
    expect(within(payments).queryByRole('link')).not.toBeInTheDocument();
  });

  it('U·date_is_shown_in_spanish: the local day written as in the Mockup', () => {
    expect(formatToday(new Date(2026, 9, 13, 12))).toBe('martes, 13 de octubre de 2026');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 12));
    render(<OperationHome {...props} data={homeTestData} />);
    expect(screen.getByText('martes, 13 de octubre de 2026')).toBeInTheDocument();
  });

  it('U·home_has_its_states: without data the numbers are dashes and nothing is labelled test data', () => {
    render(<OperationHome {...props} data={null} />);
    expect(screen.queryByText('Datos de prueba')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(7);
    expect(screen.getByText('Los indicadores llegan con las áreas comercial y de caja.')).toBeInTheDocument();
  });

  it('U·identity_card_and_profile_open_their_screens: the card only for the administrator', () => {
    const onOpenIdentity = vi.fn();
    const onOpenProfile = vi.fn();
    const { rerender } = render(<OperationHome {...props} data={null} onOpenIdentity={onOpenIdentity} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /Identidad visual/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(onOpenIdentity).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    rerender(<OperationHome {...props} canEditIdentity={false} data={null} />);
    expect(screen.queryByRole('button', { name: /Identidad visual/ })).not.toBeInTheDocument();
  });
});
