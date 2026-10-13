import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../contract';
import { show, unmountPortal } from '../shell/testkit';
import { ProfileScreen } from './ProfileScreen';

afterEach(unmountPortal);

const account = { name: 'Carlos Pérez', email: 'carlos@cliente.test', phone: '3001234567' };
const session = (over: Partial<Session> = {}): Session => ({ roles: ['FINAL_CUSTOMER'], account, open: vi.fn(), close: vi.fn(), ...over });

const draw = (s: Session, props: { onBack?: () => void; onSignOut?: () => void } = {}) =>
  render(<ProfileScreen session={s} backLabel="Volver al panel cliente" onBack={props.onBack ?? vi.fn()} onSignOut={props.onSignOut ?? vi.fn()} />);

describe('"Mi perfil" view (spec 010, RN-CAL-PRF)', () => {
  it('U·profile_renders_its_mockup_parts: the sections, the rows and the footer link in the order of the Mockup', () => {
    draw(session());
    expect(screen.getByRole('button', { name: 'Volver al panel cliente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.getByText('Consulta y actualiza tu información personal dentro del operador actual.')).toBeInTheDocument();
    const card = screen.getByRole('group', { name: 'Identidad' });
    expect(within(card).getByText('CP')).toBeInTheDocument();
    expect(within(card).getByText('Carlos Pérez')).toBeInTheDocument();
    expect(within(card).getByText('carlos@cliente.test')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Datos de la cuenta', 'Datos personales', 'Seguridad']);
    for (const label of ['Nombre completo', 'Correo electrónico', 'Rol', 'Número de teléfono']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const row of ['Editar perfil', 'Cambiar contraseña', 'Volver al panel']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${row}$`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('U·fields_are_readonly_and_fall_back_to_not_registered', () => {
    draw(session({ account: { name: 'Carlos Pérez' } }));
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Carlos Pérez');
    expect(screen.getByLabelText('Nombre completo')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('No registrado');
    expect(screen.getByLabelText('Número de teléfono')).toHaveValue('No registrado');
    expect(screen.getByLabelText('Número de teléfono')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Rol')).toHaveValue('Cliente final');
  });

  it('U·profile_has_no_commercial_summary', () => {
    draw(session());
    expect(screen.queryByText(/reservas activas|pagos pendientes|última reserva/i)).not.toBeInTheDocument();
  });

  it('U·profile_has_its_states: a session that carries no role shows the error with a way out', () => {
    const onSignOut = vi.fn();
    draw(session({ roles: [] }), { onSignOut });
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos leer tu sesión.');
    expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('Volver and the Volver al panel row both go back to the home of the role', () => {
    const onBack = vi.fn();
    draw(session(), { onBack });
    fireEvent.click(screen.getByRole('button', { name: 'Volver al panel cliente' }));
    fireEvent.click(screen.getByRole('button', { name: /^Volver al panel$/ }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});

describe('"Mi perfil" inside the customer panel', () => {
  const open = async () => {
    const shown = await show(['FINAL_CUSTOMER'], 'sierra-azul', undefined, account);
    fireEvent.click(screen.getByRole('button', { name: /Mi perfil/ }));
    return shown;
  };

  it('the Mi perfil card opens the view with the data of the session', async () => {
    await open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('carlos@cliente.test');
  });

  it('U·sign_out_calls_the_session_close: Cerrar sesión closes the session and shows the sign-in', async () => {
    const { session: s } = await open();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(s.close).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('U·edit_profile_sends_nothing: Editar perfil only toggles local state', async () => {
    const { request } = await open();
    const before = request.mock.calls.length;
    const edit = await screen.findByRole('button', { name: /^Editar perfil/ });
    fireEvent.click(edit);
    expect(edit).toHaveAttribute('aria-pressed', 'true');
    expect(request.mock.calls.length).toBe(before);
  });

  it('Volver al panel cliente returns to the panel', async () => {
    await open();
    fireEvent.click(await screen.findByRole('button', { name: 'Volver al panel cliente' }));
    expect(await screen.findByRole('heading', { name: 'Hola' })).toBeInTheDocument();
  });
});
