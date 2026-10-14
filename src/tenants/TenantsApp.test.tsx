import { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import type { TenantResponse } from '../data/tenants';
import { mount } from '../mount';
import { TenantsApp } from './TenantsApp';

const admin: Session = { roles: ['PLATFORM_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };

const tenant = (over: Partial<TenantResponse> = {}): TenantResponse => ({
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  identifier: 'travesia-natural',
  commercialName: 'Travesia Natural',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  createdAt: '2026-01-10T08:00:00Z',
  ...over,
});
const page = (data: TenantResponse[], meta = {}) => ({ data, meta: { page: 1, limit: 20, total: data.length, totalPages: 1, ...meta } });
const client = (request: ApiClient['request']): ApiClient => ({ request });
const renderApp = (request: ApiClient['request'], session: Session = admin) =>
  render(<TenantsApp apiClient={client(request)} session={session} />);
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });

describe('TenantsApp list', () => {
  it('screens_are_hidden_without_the_role: renders nothing and asks for nothing', () => {
    const request = vi.fn();
    const { container } = renderApp(request, { ...admin, roles: ['TENANT_ADMINISTRATOR'] });
    expect(container).toBeEmptyDOMElement();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([[[]], [['PLATFORM_ADMINISTRATOR_X']]])('screens_are_hidden_without_the_role: %j sees nothing', (roles) => {
    const request = vi.fn();
    const { container } = renderApp(request, { ...admin, roles });
    expect(container).toBeEmptyDOMElement();
    expect(request).not.toHaveBeenCalled();
  });

  it('list_has_four_states: loading first', () => {
    renderApp(vi.fn().mockReturnValue(new Promise(() => {})));
    expect(screen.getByRole('heading', { name: 'Operadores' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('list_has_four_states: data shows name, identifier, status and date, asking the first page', async () => {
    const request = vi.fn().mockResolvedValue(page([tenant(), tenant({ tenantId: 'b', identifier: 'sierra-azul', commercialName: 'Sierra Azul', tenantStatus: 'INACTIVE' })]));
    renderApp(request);
    expect(await screen.findByText('Travesia Natural')).toBeInTheDocument();
    expect(request.mock.calls[0][0]).toBe('/api/v1/identity-audit/tenants?page=1&limit=20');
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('travesia-natural')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Activo')).toBeInTheDocument();
    expect(within(rows[1]).getByText('2026-01-10')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Inactivo')).toBeInTheDocument();
  });

  it('list_has_four_states: empty shows its text', async () => {
    renderApp(vi.fn().mockResolvedValue(page([])));
    expect(await screen.findByText('Aún no hay operadores registrados.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('list_has_four_states: error shows a fixed text with the trace id and retries', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(500, { traceId: 'tr-7', message: 'pg: boom' })).mockResolvedValueOnce(page([tenant()]));
    renderApp(request);
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-7/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Travesia Natural')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('the status filter asks for that status from the first page', async () => {
    const request = vi.fn().mockResolvedValue(page([tenant()]));
    renderApp(request);
    await screen.findByText('Travesia Natural');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'FAILED' } });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0]).toBe('/api/v1/identity-audit/tenants?page=1&limit=20&status=FAILED');
  });

  it('pages: next and previous move through the pages and the edges are disabled', async () => {
    const request = vi.fn().mockImplementation((path: string) =>
      Promise.resolve(path.includes('page=2') ? page([tenant({ commercialName: 'Segunda' })], { page: 2, totalPages: 2, total: 21 }) : page([tenant()], { totalPages: 2, total: 21 })),
    );
    renderApp(request);
    await screen.findByText('Travesia Natural');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Segunda')).toBeInTheDocument();
    expect(request.mock.calls[1][0]).toBe('/api/v1/identity-audit/tenants?page=2&limit=20');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('newer_request_replaces_the_older: a late answer to the first request is dropped', async () => {
    const answers: ((v: unknown) => void)[] = [];
    const request = vi.fn().mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    renderApp(request);
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ACTIVE' } });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => answers[1](page([tenant({ commercialName: 'Nueva' })])));
    await act(async () => answers[0](page([tenant({ commercialName: 'Vieja' })])));
    expect(screen.getByText('Nueva')).toBeInTheDocument();
    expect(screen.queryByText('Vieja')).not.toBeInTheDocument();
  });
});

describe('mount shows the tenants to the Platform Administrator', () => {
  let unmount = () => {};
  afterEach(async () => {
    await act(async () => unmount());
    document.body.innerHTML = '';
  });
  const show = async (session: Session, identifier?: string) => {
    const element = document.body.appendChild(document.createElement('div'));
    const apiClient = client(vi.fn().mockResolvedValue(page([tenant()])));
    await act(async () => {
      unmount = mount(element, { apiClient, session, identifier });
    });
  };

  it('a signed-in Platform Administrator on the platform link sees the shell, whose first page is the summary', async () => {
    await show(admin);
    expect(await screen.findByRole('heading', { name: 'Operadores bajo control' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Operadores' }));
    expect(await screen.findByText('Travesia Natural')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acceso de plataforma' })).not.toBeInTheDocument();
  });

  it('without the role the platform link still shows the sign-in', async () => {
    await show({ ...admin, roles: [] });
    expect(screen.getByRole('heading', { name: 'Acceso de plataforma' })).toBeInTheDocument();
  });

  it('a company link never shows the list', async () => {
    await show(admin, 'acme');
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });
});
