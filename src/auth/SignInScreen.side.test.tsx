import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Scope } from '../contract';
import { containerSession } from '../shell/testkit';
import { SignInScreen } from './SignInScreen';

// HU-SEC-008, AC2 (portal spec 017): each tab asks the service for its side, so a person who is customer and team member works from the
// one they chose.

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

afterEach(() => window.history.replaceState(null, '', '/'));

function setup(scope: Scope, grants: string[]) {
  const request = vi.fn().mockResolvedValue(answer);
  render(
    <SignInScreen
      scope={scope}
      identifier={scope === 'tenant' ? 'acme' : undefined}
      apiClient={{ request }}
      session={containerSession(scope, grants)}
    />,
  );
  return request;
}

function signIn(button = 'Iniciar sesión') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@acme.co' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Viaje-2026!' } });
  fireEvent.click(screen.getByRole('button', { name: button }));
}

describe('the side asked at sign-in', () => {
  it('the customer tab asks for the customer side', async () => {
    const request = setup('tenant', ['FINAL_CUSTOMER']);
    signIn();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][1].body).toMatchObject({ context: 'CUSTOMER' });
  });

  it('the team tab asks for the team side', async () => {
    const request = setup('tenant', ['TENANT_ADMINISTRATOR']);
    fireEvent.click(screen.getByRole('button', { name: 'Equipo del operador' }));
    signIn();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][1].body).toMatchObject({ context: 'TEAM' });
  });

  it('the platform sign-in asks for no side', async () => {
    const request = setup('platform', ['PLATFORM_ADMINISTRATOR']);
    signIn('Ingresar a plataforma');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][1].body).not.toHaveProperty('context');
  });
});
