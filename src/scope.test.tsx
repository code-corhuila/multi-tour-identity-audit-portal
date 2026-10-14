import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient, MountProps, Session } from './contract';
import { mount } from './mount';
import { containerSession } from './shell/testkit';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

async function show(props: Partial<MountProps>, request: ApiClient['request'] = vi.fn().mockResolvedValue(answer), roles: string[] = []) {
  const element = document.body.appendChild(document.createElement('div'));
  // Like the container's session: in the general scope `open` throws without the company.
  const session = containerSession(props.scope, roles);
  const navigate = vi.fn();
  const all: MountProps = { apiClient: { request }, session, navigate, ...props } as MountProps;
  await act(async () => {
    unmount = mount(element, all);
  });
  return { session, navigate, request: request as unknown as ReturnType<typeof vi.fn> };
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const signInWith = (company: string | null = 'sierra-azul') => {
  void company;
  type('Correo electrónico', 'ana@sierra.co');
  type('Contraseña', 'Viaje-2026!');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
};

describe("scope 'tenant' and 'platform'", () => {
  it('tenant: no Empresa field, and Volver al inicio goes to the company home through navigate', async () => {
    const { navigate } = await show({ scope: 'tenant', identifier: 'acme' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }))).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/t/acme');
  });

  it("platform: 'Volver al acceso general' goes back to the container's welcome", async () => {
    const { navigate } = await show({ scope: 'platform' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al acceso general' }))).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/');
  });

  it('a tenant sign-in opens the session with the answer only', async () => {
    const { session } = await show({ scope: 'tenant', identifier: 'acme' });
    signInWith(null);
    await waitFor(() => expect(session.open).toHaveBeenCalledWith(answer));
  });

  it('a platform sign-in opens the session with the answer only', async () => {
    const { session } = await show({ scope: 'platform' });
    type('Correo electrónico', 'root@multitour.co');
    type('Contraseña', 'Viaje-2026!');
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a plataforma' }));
    await waitFor(() => expect(session.open).toHaveBeenCalledWith(answer));
  });

  // jsdom reports a real anchor navigation as "Not implemented: navigation" on console.error; the click is what is
  // under test, so the noise is silenced in the two tests that let the browser handle it.
  it('no navigate: the anchors keep their default behavior', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    await show({ scope: 'platform', navigate: undefined });
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al acceso general' }))).toBe(true);
    // jsdom reports the navigation from a timer, after the click returned.
    await new Promise((r) => setTimeout(r, 0));
    quiet.mockRestore();
  });

  it('a modified click (new tab) is left to the browser', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { navigate } = await show({ scope: 'tenant', identifier: 'acme' });
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }), { ctrlKey: true })).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    // jsdom reports the navigation from a timer, after the click returned.
    await new Promise((r) => setTimeout(r, 0));
    quiet.mockRestore();
  });

  it.each([
    ['TENANT_ADMINISTRATOR', 'Control de la operación'],
    ['FINAL_CUSTOMER', 'Hola'],
  ])('tenant scope at /ingresar with an open %s session shows the panel, not the sign-in', async (role, heading) => {
    const element = document.body.appendChild(document.createElement('div'));
    const session: Session = { roles: [role], open: vi.fn(), close: vi.fn() };
    await act(async () => {
      unmount = mount(element, { apiClient: { request: vi.fn() }, session, identifier: 'sierra-azul', scope: 'tenant', navigate: vi.fn() });
    });
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bienvenido de nuevo' })).not.toBeInTheDocument();
  });

  it('area cards of the staff panel navigate through the container and keep their href', async () => {
    const element = document.body.appendChild(document.createElement('div'));
    const navigate = vi.fn();
    const session: Session = { roles: ['TENANT_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };
    await act(async () => {
      unmount = mount(element, { apiClient: { request: vi.fn() }, session, identifier: 'sierra-azul', scope: 'tenant', navigate });
    });
    const card = screen.getByRole('link', { name: /Catálogos/ });
    expect(card).toHaveAttribute('href', '/t/sierra-azul/areas/commercial-reservation-portal');
    expect(fireEvent.click(card)).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/t/sierra-azul/areas/commercial-reservation-portal');
  });
});
