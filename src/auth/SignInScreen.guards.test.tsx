import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { SignInScreen } from './SignInScreen';

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

type Call = { signal: AbortSignal; resolve: (value: unknown) => void };

// A client whose requests stay pending until the test resolves them.
function pendingClient() {
  const calls: Call[] = [];
  const request = vi.fn((_path: string, init?: { signal?: AbortSignal }) => {
    return new Promise((resolve) => calls.push({ signal: init!.signal!, resolve }));
  });
  return { calls, request, client: { request } as unknown as ApiClient };
}

function newSession(): Session {
  return { roles: [], open: vi.fn(), close: vi.fn() };
}

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
}

const form = () => screen.getByRole('button', { name: /Iniciar sesión|Ingresando…/ }).closest('form')!;

describe('invalid identifier in the link', () => {
  it.each(['', '.', '..', 'Acme', 'a b', 'ac/me'])('invalid_identifier_shows_not_found_and_sends_nothing: "%s"', (id) => {
    const { client, request } = pendingClient();
    render(<SignInScreen identifier={id} apiClient={client} session={newSession()} />);
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});

describe('statuses other than a refusal', () => {
  it.each([413, 415, 500])('status_%i_keeps_the_common_message_with_trace', async (status) => {
    const request = vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { status, traceId: 't-9' }));
    render(<SignInScreen identifier="acme" apiClient={{ request }} session={newSession()} />);
    fill('ana@acme.co', 'secret-pass');
    fireEvent.submit(form());
    expect(await screen.findByText(/No pudimos completar la solicitud/)).toHaveTextContent('t-9');
    expect(screen.queryByText('Correo o contraseña incorrectos')).not.toBeInTheDocument();
  });
});

describe('request lifecycle', () => {
  it('newer_submit_aborts_the_older_request_and_ignores_its_late_answer', async () => {
    const { client, calls } = pendingClient();
    const session = newSession();
    render(<SignInScreen identifier="acme" apiClient={client} session={session} />);
    fill('ana@acme.co', 'secret-pass');
    fireEvent.submit(form());
    fireEvent.submit(form());
    expect(calls).toHaveLength(2);
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);
    await act(async () => calls[0].resolve({ ...answer, accessToken: 'old' }));
    expect(session.open).not.toHaveBeenCalled();
    await act(async () => calls[1].resolve(answer));
    expect(session.open).toHaveBeenCalledTimes(1);
    expect(session.open).toHaveBeenCalledWith(answer);
  });

  it('unmount_aborts_the_request_in_flight', () => {
    const { client, calls } = pendingClient();
    const { unmount } = render(<SignInScreen identifier="acme" apiClient={client} session={newSession()} />);
    fill('ana@acme.co', 'secret-pass');
    fireEvent.submit(form());
    unmount();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('password_is_cleared_after_the_session_is_opened', async () => {
    const { client, calls } = pendingClient();
    const session = newSession();
    render(<SignInScreen identifier="acme" apiClient={client} session={session} />);
    fill('ana@acme.co', 'secret-pass');
    fireEvent.submit(form());
    await act(async () => calls[0].resolve(answer));
    await waitFor(() => expect(session.open).toHaveBeenCalled());
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });
});
