import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Scope } from '../contract';
import { containerSession } from '../shell/testkit';
import { SignInScreen } from './SignInScreen';

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };
const MISMATCH = 'Esta cuenta no tiene el rol seleccionado.';

afterEach(() => window.history.replaceState(null, '', '/'));

function setup(scope: Scope, grants: string[]) {
  const session = containerSession(scope, grants);
  const request = vi.fn().mockResolvedValue(answer);
  const onSignedIn = vi.fn();
  render(
    <SignInScreen
      scope={scope}
      identifier={scope === 'tenant' ? 'acme' : undefined}
      apiClient={{ request }}
      session={session}
      onSignedIn={onSignedIn}
    />,
  );
  return { session, onSignedIn };
}

const operatorTab = () => fireEvent.click(screen.getByRole('button', { name: 'Equipo del operador' }));
const profile = (name: 'Administrador' | 'Colaborador') => screen.getByRole('button', { name });
function signIn() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@acme.co' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe.each<Scope>(['tenant'])('team role selector, scope %s', (scope) => {
  it('is hidden on the Cliente tab and shown on the operator tab with Administrador pressed', () => {
    setup(scope, []);
    expect(screen.queryByText('Rol en el equipo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Colaborador' })).not.toBeInTheDocument();
    operatorTab();
    expect(screen.getByRole('group', { name: 'Rol en el equipo' })).toBeInTheDocument();
    expect(profile('Administrador')).toHaveAttribute('aria-pressed', 'true');
    expect(profile('Colaborador')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the selected profile with the buttons and goes back to hidden on the Cliente tab', () => {
    setup(scope, []);
    operatorTab();
    fireEvent.click(profile('Colaborador'));
    expect(profile('Colaborador')).toHaveAttribute('aria-pressed', 'true');
    expect(profile('Administrador')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(screen.queryByRole('button', { name: 'Colaborador' })).not.toBeInTheDocument();
  });

  it('Administrador with a TENANT_ADMINISTRATOR account goes through', async () => {
    const { session, onSignedIn } = setup(scope, ['TENANT_ADMINISTRATOR']);
    operatorTab();
    signIn();
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(session.close).not.toHaveBeenCalled();
  });

  it.each(['OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'])(
    'Colaborador with a %s account goes through',
    async (role) => {
      const { session, onSignedIn } = setup(scope, [role]);
      operatorTab();
      fireEvent.click(profile('Colaborador'));
      signIn();
      await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
      expect(session.close).not.toHaveBeenCalled();
    },
  );

  it('Administrador with a collaborator account closes the session and shows the fixed text', async () => {
    const { session, onSignedIn } = setup(scope, ['MANAGER']);
    operatorTab();
    signIn();
    expect(await screen.findByText(MISMATCH)).toBeInTheDocument();
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });

  it('Colaborador with an administrator account closes the session and shows the fixed text', async () => {
    const { session } = setup(scope, ['TENANT_ADMINISTRATOR']);
    operatorTab();
    fireEvent.click(profile('Colaborador'));
    signIn();
    expect(await screen.findByText(MISMATCH)).toBeInTheDocument();
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('a FINAL_CUSTOMER account on the operator tab is refused with the existing fixed text and the session is closed', async () => {
    const { session, onSignedIn } = setup(scope, ['FINAL_CUSTOMER']);
    operatorTab();
    signIn();
    const text = /Correo o contraseña incorrectos/;
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument();
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('the Cliente tab keeps its behavior: a signed-in account goes through without a role check', async () => {
    const { session, onSignedIn } = setup(scope, ['FINAL_CUSTOMER']);
    signIn();
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(session.close).not.toHaveBeenCalled();
  });
});

describe('team role selector, access marks', () => {
  it.each(['password-change', 'restricted'] as const)('a %s token is not checked against the profile nor closed', async (access) => {
    const session = containerSession('tenant', []);
    const open = session.open;
    session.open = vi.fn((a: unknown, i?: string) => {
      open(a, i);
      session.access = access;
    });
    const onSignedIn = vi.fn();
    render(<SignInScreen scope="tenant" identifier="acme" apiClient={{ request: vi.fn().mockResolvedValue(answer) }} session={session} onSignedIn={onSignedIn} />);
    operatorTab();
    signIn();
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(session.close).not.toHaveBeenCalled();
    expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument();
  });
});

describe('team role selector, details', () => {
  it('?tab=operador shows it from the start and the platform sign-in has none', () => {
    window.history.replaceState(null, '', '/t/acme/ingresar?tab=operador');
    const { unmount } = render(
      <SignInScreen scope="tenant" identifier="acme" apiClient={{ request: vi.fn() }} session={containerSession('tenant')} />,
    );
    expect(profile('Administrador')).toHaveAttribute('aria-pressed', 'true');
    unmount();
    render(<SignInScreen scope="platform" apiClient={{ request: vi.fn() }} session={containerSession('platform')} />);
    expect(screen.queryByText('Rol en el equipo')).not.toBeInTheDocument();
  });

  it('the profile buttons are reachable by keyboard: native buttons, in tab order after the tabs', () => {
    setup('tenant', []);
    operatorTab();
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons.indexOf('Administrador')).toBeGreaterThan(buttons.indexOf('Equipo del operador'));
    expect(profile('Administrador').tagName).toBe('BUTTON');
    expect(profile('Administrador')).toHaveAttribute('type', 'button');
  });
});
