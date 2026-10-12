import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient, MountProps, Session } from './contract';
import { mount } from './mount';

let unmount = () => {};
afterEach(async () => {
  await act(async () => unmount());
  document.body.innerHTML = '';
});

const answer = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 };

async function show(props: Partial<MountProps>, request: ApiClient['request'] = vi.fn().mockResolvedValue(answer), roles: string[] = []) {
  const element = document.body.appendChild(document.createElement('div'));
  const session: Session = { roles: [], open: vi.fn(), close: vi.fn() };
  // Like the container's session: opening it sets the roles of the token.
  session.open = vi.fn(() => {
    session.roles = roles;
  });
  const navigate = vi.fn();
  const all: MountProps = { apiClient: { request }, session, navigate, ...props } as MountProps;
  await act(async () => {
    unmount = mount(element, all);
  });
  return { session, navigate, request };
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const signInWith = (company: string | null = 'sierra-azul') => {
  if (company !== null) type('Empresa', company);
  type('Correo electrónico', 'ana@sierra.co');
  type('Contraseña', 'Viaje-2026!');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
};

describe("scope 'general': the company is typed", () => {
  it('shows the Empresa field above the e-mail and signs in against the typed company, then navigates to it', async () => {
    const { navigate, request } = await show({ scope: 'general' });
    const company = screen.getByLabelText('Empresa');
    const email = screen.getByLabelText('Correo electrónico');
    expect(company.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    signInWith();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/t/sierra-azul'));
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/tenants/sierra-azul/sessions');
  });

  it('flags a company that is not kebab-case of 3 to 40 beside the field and sends nothing', async () => {
    const { request } = await show({ scope: 'general' });
    for (const bad of ['', 'ab', 'Sierra Azul', 'a'.repeat(41), '-sierra', 'sierra--azul']) {
      type('Empresa', bad);
      type('Correo electrónico', 'ana@sierra.co');
      type('Contraseña', 'Viaje-2026!');
      fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      const company = screen.getByLabelText('Empresa');
      expect(company.getAttribute('aria-invalid')).toBe('true');
      expect(company.getAttribute('aria-describedby')).toBe(document.querySelector('#signin-company-error')?.id);
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('a failed company lookup shows the fixed text with the trace id and no detail', async () => {
    const request = vi.fn().mockRejectedValue(Object.assign(new Error('Tenant not found'), { status: 401, traceId: 'tr-5' }));
    await show({ scope: 'general' }, request);
    signInWith('no-existe');
    expect(await screen.findByText(/Credenciales o empresa incorrectas.*tr-5/)).toBeInTheDocument();
    expect(screen.queryByText(/Tenant not found/)).not.toBeInTheDocument();
  });

  it('Crear cuenta needs the company too and registers against the typed one', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'a1' });
    await show({ scope: 'general' }, request);
    type('Empresa', 'sierra-azul');
    fireEvent.click(screen.getByRole('link', { name: 'Crear cuenta' }));
    expect(screen.getByLabelText('Empresa')).toHaveValue('sierra-azul');
    type('Empresa', 'otra-empresa');
    type('Nombre', 'Laura');
    type('Apellido', 'Pérez');
    type('Correo electrónico', 'laura@example.com');
    type('Número de teléfono', '3001234567');
    type('Contraseña', 'Viaje-2026!');
    type('Confirmar contraseña', 'Viaje-2026!');
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][0]).toBe('/api/v1/security/public/tenants/otra-empresa/accounts');
  });

  it('without navigate (old container) a signed-in staff user still reaches the tenant panel', async () => {
    await show({ scope: 'general', navigate: undefined }, undefined, ['TENANT_ADMINISTRATOR']);
    signInWith();
    expect(await screen.findByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    expect(screen.getByText('sierra-azul')).toBeInTheDocument();
  });

  it("'Administración de plataforma' and the brand and home links go through navigate", async () => {
    const { navigate } = await show({ scope: 'general' });
    expect(fireEvent.click(screen.getByRole('link', { name: /Administración de plataforma/ }))).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/platform');
    for (const link of screen.getAllByRole('link', { name: 'Multi Tour' })) {
      fireEvent.click(link);
      expect(navigate).toHaveBeenLastCalledWith('/');
    }
  });
});

describe("scope 'tenant' and 'platform'", () => {
  it('tenant: no Empresa field, and Volver al inicio goes to the company home through navigate', async () => {
    const { navigate } = await show({ scope: 'tenant', identifier: 'acme' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }))).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/t/acme');
  });

  it("platform: 'Volver al acceso general' goes back to the general sign-in", async () => {
    const { navigate } = await show({ scope: 'platform' });
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument();
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al acceso general' }))).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/ingresar');
  });

  it('no navigate: the anchors keep their default behavior', async () => {
    await show({ scope: 'platform', navigate: undefined });
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al acceso general' }))).toBe(true);
  });

  it('a modified click (new tab) is left to the browser', async () => {
    const { navigate } = await show({ scope: 'tenant', identifier: 'acme' });
    expect(fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }), { ctrlKey: true })).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
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
