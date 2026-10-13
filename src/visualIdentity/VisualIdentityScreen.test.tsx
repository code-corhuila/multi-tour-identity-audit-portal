import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { VisualIdentityScreen } from './VisualIdentityScreen';

// Answers copied from the contract examples (identity-audit.yaml, `setTenantVisualIdentity`).
const tenant = {
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  identifier: 'travesia-natural',
  commercialName: 'Travesia Natural',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  visualIdentity: { primaryColor: '#146B5D', secondaryColor: '#0F564B' },
  createdAt: '2026-01-10T08:00:00Z',
};
const saved = { primaryColor: '#146b5d', secondaryColor: '#0f564b' };
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const admin: Session = { roles: ['TENANT_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };

function setup(request: ApiClient['request'], props: Partial<Parameters<typeof VisualIdentityScreen>[0]> = {}) {
  const onVisualIdentityChange = vi.fn();
  const utils = render(
    <VisualIdentityScreen
      apiClient={{ request }}
      session={admin}
      commercialName="Travesia Natural"
      visualIdentity={saved}
      onVisualIdentityChange={onVisualIdentityChange}
      {...props}
    />,
  );
  return { onVisualIdentityChange, ...utils };
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar identidad visual' }));
const described = (label: string) => screen.getByLabelText(label).getAttribute('aria-describedby') ?? '';
const previewVar = (name: string) => screen.getByTestId('visual-identity-preview').style.getPropertyValue(name);

describe('VisualIdentityScreen', () => {
  it('visual_identity_screen_is_hidden_without_the_role', () => {
    const request = vi.fn();
    for (const roles of [['MANAGER'], ['PLATFORM_ADMINISTRATOR'], ['FINAL_CUSTOMER'], []]) {
      const { container, unmount } = render(
        <VisualIdentityScreen apiClient={{ request }} session={{ ...admin, roles }} visualIdentity={saved} />,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('only_two_color_fields_are_offered: a picker and a text per color, and the company name as context', () => {
    const { container } = setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Identidad visual' })).toBeInTheDocument();
    expect(container.querySelectorAll('input[type="color"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(2);
    expect(container.querySelectorAll('select, textarea, input[type="file"]')).toHaveLength(0);
    expect(screen.getByLabelText('Color principal')).toBeInTheDocument();
    expect(screen.getByLabelText('Color secundario')).toBeInTheDocument();
    expect(screen.getByText('Travesia Natural')).toBeInTheDocument();
  });

  it('fields_start_with_the_saved_colors: and the default note is not shown', () => {
    setup(vi.fn());
    expect(screen.getByLabelText('Color principal')).toHaveValue('#146b5d');
    expect(screen.getByLabelText('Color secundario')).toHaveValue('#0f564b');
    expect(screen.queryByText('Tu empresa usa la identidad por defecto de Multitour.')).not.toBeInTheDocument();
  });

  it('empty_state_starts_with_defaults_and_note', () => {
    setup(vi.fn(), { visualIdentity: null });
    expect(screen.getByText('Tu empresa usa la identidad por defecto de Multitour.')).toBeInTheDocument();
    expect(screen.getByLabelText('Color principal')).toHaveValue('#2f6b57');
    expect(screen.getByLabelText('Color secundario')).toHaveValue('#1f4d3d');
  });

  it('screen_has_four_states: loading first, with the form not offered', () => {
    const { container } = setup(vi.fn(), { loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(container.querySelector('form')).toBeNull();
  });

  it('fields_start_with_the_colors_that_arrive_after_loading, not with the defaults', () => {
    const request = vi.fn();
    const { rerender } = render(<VisualIdentityScreen apiClient={{ request }} session={admin} loading visualIdentity={undefined} />);
    rerender(<VisualIdentityScreen apiClient={{ request }} session={admin} loading={false} visualIdentity={saved} />);
    expect(screen.getByLabelText('Color principal')).toHaveValue('#146b5d');
    expect(screen.queryByText('Tu empresa usa la identidad por defecto de Multitour.')).not.toBeInTheDocument();
  });

  it('the picker and the text are kept in step', () => {
    const { container } = setup(vi.fn());
    const picker = container.querySelectorAll<HTMLInputElement>('input[type="color"]')[0];
    fireEvent.change(picker, { target: { value: '#aa0000' } });
    expect(screen.getByLabelText('Color principal')).toHaveValue('#aa0000');
    type('Color secundario', '#00AA00');
    expect(container.querySelectorAll<HTMLInputElement>('input[type="color"]')[1]).toHaveValue('#00aa00');
  });

  it('bad_color_is_flagged_and_not_sent: beside its field, with aria-describedby', () => {
    const request = vi.fn();
    setup(request);
    type('Color principal', 'azul');
    type('Color secundario', '#12345');
    save();
    expect(request).not.toHaveBeenCalled();
    for (const label of ['Color principal', 'Color secundario']) {
      expect(screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
      expect(described(label)).not.toBe('');
    }
    expect(screen.getAllByText('Escribe el color como #RRGGBB.')).toHaveLength(2);
  });

  it('preview_follows_the_inputs_and_page_is_unchanged', () => {
    setup(vi.fn());
    type('Color principal', '#112233');
    type('Color secundario', '#445566');
    expect(previewVar('--accent')).toBe('#112233');
    expect(previewVar('--accent-strong')).toBe('#445566');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
    expect(document.body.style.getPropertyValue('--accent')).toBe('');
    // A half-typed value does not reach the preview.
    type('Color principal', '#12');
    expect(previewVar('--accent')).toBe('#112233');
  });

  it('request_has_exactly_two_fields: a PUT to the route of the contract, with no Idempotency-Key', async () => {
    const request = vi.fn().mockResolvedValue(tenant);
    setup(request);
    type('Color principal', '#146b5d');
    save();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/api/v1/identity-audit/tenant/visual-identity');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({ primaryColor: '#146b5d', secondaryColor: '#0f564b' });
    expect(init.headers).toBeUndefined();
  });

  it('submit_is_disabled_while_sending', async () => {
    let resolve: (v?: unknown) => void = () => {};
    setup(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    save();
    const button = await screen.findByRole('button', { name: 'Guardando…' });
    expect(button).toBeDisabled();
    resolve(tenant);
    await screen.findByText('Identidad visual guardada. Tus clientes verán estos colores.');
  });

  it('page_takes_the_colors_after_a_good_save: onVisualIdentityChange is called once with the saved pair', async () => {
    const { onVisualIdentityChange } = setup(vi.fn().mockResolvedValue(tenant));
    type('Color principal', '#146b5d');
    expect(onVisualIdentityChange).not.toHaveBeenCalled();
    save();
    expect(await screen.findByText('Identidad visual guardada. Tus clientes verán estos colores.')).toBeInTheDocument();
    expect(onVisualIdentityChange).toHaveBeenCalledTimes(1);
    expect(onVisualIdentityChange).toHaveBeenCalledWith({ primaryColor: '#146B5D', secondaryColor: '#0F564B' });
  });

  it('works without the optional props of an older container', async () => {
    render(<VisualIdentityScreen apiClient={{ request: vi.fn().mockResolvedValue(tenant) }} session={admin} />);
    expect(screen.getByText('Tu empresa usa la identidad por defecto de Multitour.')).toBeInTheDocument();
    save();
    expect(await screen.findByText(/Identidad visual guardada/)).toBeInTheDocument();
  });

  it('field_error_is_shown_beside_the_field: the 400 details, never the service message', async () => {
    const details = [{ field: 'primaryColor', message: 'must be a color written #RRGGBB' }];
    setup(vi.fn().mockRejectedValue(failure(400, { details })));
    save();
    expect(await screen.findByText('Escribe el color como #RRGGBB.')).toBeInTheDocument();
    expect(described('Color principal')).toContain(screen.getByText('Escribe el color como #RRGGBB.').id);
    expect(screen.queryByText(/must be a color/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Color secundario').getAttribute('aria-invalid')).toBeNull();
  });

  it('403 is shown as not authorised and 422 as an inactive company', async () => {
    const { unmount } = setup(vi.fn().mockRejectedValue(failure(403)));
    save();
    expect(await screen.findByText('No tienes permiso para cambiar la identidad visual.')).toBeInTheDocument();
    unmount();
    setup(vi.fn().mockRejectedValue(failure(422)));
    save();
    expect(await screen.findByText('La empresa está inactiva: no se puede cambiar su identidad visual.')).toBeInTheDocument();
  });

  it('failure_keeps_the_typed_colors_and_offers_retry', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(500, { traceId: 'tr-1', message: 'pg: boom' })).mockResolvedValueOnce(tenant);
    setup(request);
    type('Color principal', '#112233');
    save();
    expect(await screen.findByText(/No pudimos completar la solicitud\. Intenta de nuevo\..*tr-1/)).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Color principal')).toHaveValue('#112233');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1].body).toEqual(request.mock.calls[0][1].body);
  });

  it('newer_save_replaces_the_older: the request in flight is aborted when a newer one starts or the screen leaves', async () => {
    const signals: AbortSignal[] = [];
    const request = vi.fn((_p: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise(() => {});
    }) as unknown as ApiClient['request'];
    const { unmount } = setup(request);
    save();
    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    unmount();
    expect(signals[0].aborted).toBe(true);
  });
});
