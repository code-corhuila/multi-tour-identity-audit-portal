import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { LocalizationScreen } from './LocalizationScreen';
import { localizationMessages as text } from './messages';

// Answers copied from the contract examples (identity-audit.yaml, `getTenantLocalization` and `changeTenantLocalization`).
const tenant = {
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  identifier: 'travesia-natural',
  commercialName: 'Travesia Natural',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  createdAt: '2026-01-10T08:00:00Z',
};
const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const admin: Session = { roles: ['TENANT_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };

// The service as a stub: a GET answers the tenant as it is, a PUT answers it with what was sent applied.
function service(put?: (body: Record<string, string>) => unknown, read: unknown = tenant) {
  return vi.fn(async (_path: string, init?: { method?: string; body?: unknown }) => {
    if (init?.method === 'PUT') {
      if (put) return put(init.body as Record<string, string>);
      return { ...tenant, ...(init.body as object) };
    }
    return read;
  }) as unknown as ApiClient['request'] & ReturnType<typeof vi.fn>;
}

async function open(request: ApiClient['request'], props: Partial<Parameters<typeof LocalizationScreen>[0]> = {}) {
  const onLocalizationChange = vi.fn();
  const utils = render(<LocalizationScreen apiClient={{ request }} session={admin} onLocalizationChange={onLocalizationChange} {...props} />);
  await screen.findByLabelText('Zona horaria');
  return { onLocalizationChange, ...utils };
}

const choose = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const review = () => fireEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
const puts = (request: unknown) => (request as ReturnType<typeof vi.fn>).mock.calls.filter((c: unknown[]) => (c[1] as { method?: string })?.method === 'PUT');

describe('LocalizationScreen (portal spec 018)', () => {
  it('U·localization_screen_is_for_the_tenant_administrator_only: nothing is drawn or asked for anyone else', () => {
    const request = vi.fn();
    for (const roles of [['MANAGER'], ['PLATFORM_ADMINISTRATOR'], ['OPERATIONAL_COLLABORATOR'], ['FINAL_CUSTOMER'], []]) {
      const { container, unmount } = render(<LocalizationScreen apiClient={{ request }} session={{ ...admin, roles }} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('U·fields_start_with_the_current_values: the zone and the country of the tenant, the country by its name, and the company as context', async () => {
    await open(service());

    expect((screen.getByLabelText('Zona horaria') as HTMLSelectElement).value).toBe('America/Bogota');
    expect((screen.getByLabelText('País') as HTMLSelectElement).value).toBe('CO');
    expect(screen.getByText('Zona horaria actual: America/Bogota')).toBeInTheDocument();
    expect(screen.getByText('País actual: Colombia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Zona horaria y país' })).toBeInTheDocument();
    expect(screen.getByText('Travesia Natural')).toBeInTheDocument();
    expect(screen.getByText(/rige desde ahora/i)).toBeInTheDocument();
  });

  it('U·screen_has_its_states: loading, a failed read with retry, the company inactive and the data', async () => {
    let answer: (tenant: unknown) => void = () => {};
    const pending = new Promise((resolve) => (answer = resolve));
    const slow = vi.fn(() => pending) as unknown as ApiClient['request'];
    const { unmount } = render(<LocalizationScreen apiClient={{ request: slow }} session={admin} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    unmount();
    answer(tenant);

    const request = vi.fn().mockRejectedValueOnce(failure(503, { traceId: 'trace-7' })).mockResolvedValueOnce(tenant) as unknown as ApiClient['request'];
    render(<LocalizationScreen apiClient={{ request }} session={admin} />);
    expect(await screen.findByText(/trace-7/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByLabelText('Zona horaria');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('U·an_inactive_company_is_told_and_not_offered_the_form: the status read decides, the values are still shown', async () => {
    render(<LocalizationScreen apiClient={{ request: service(undefined, { ...tenant, tenantStatus: 'INACTIVE' }) }} session={admin} />);

    expect(await screen.findByText(text.inactive)).toBeInTheDocument();
    expect(screen.getByText('Zona horaria actual: America/Bogota')).toBeInTheDocument();
    expect(screen.queryByLabelText('Zona horaria')).toBeNull();
  });

  it('U·review_is_disabled_without_a_difference: only a choice different from the current one enables it', async () => {
    await open(service());
    const button = screen.getByRole('button', { name: 'Revisar cambio' });
    expect(button).toBeDisabled();

    choose('Zona horaria', 'America/Lima');
    expect(button).toBeEnabled();
    choose('Zona horaria', 'America/Bogota');
    expect(button).toBeDisabled();
  });

  it('U·nothing_is_sent_before_confirming: the review shows the summary and the only request is the read', async () => {
    const request = service();
    await open(request);

    choose('Zona horaria', 'America/Lima');
    review();

    expect(screen.getByText('Zona horaria: America/Bogota → America/Lima')).toBeInTheDocument();
    expect(puts(request)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect((screen.getByLabelText('Zona horaria') as HTMLSelectElement).value).toBe('America/Lima');
    expect(puts(request)).toHaveLength(0);
  });

  it('U·confirmation_shows_only_what_changes: a country alone shows no line of the zone', async () => {
    await open(service());

    choose('País', 'PE');
    review();

    expect(screen.getByText('País: Colombia → Perú')).toBeInTheDocument();
    expect(screen.queryByText(/^Zona horaria:/)).toBeNull();
  });

  it('U·request_has_only_the_changed_fields: confirming sends the country and not the zone, and the screen says it is saved', async () => {
    const request = service();
    const { onLocalizationChange } = await open(request);

    choose('País', 'PE');
    review();
    confirm();

    expect(await screen.findByText('Cambio guardado. Rige desde ahora.')).toBeInTheDocument();
    expect(puts(request)).toHaveLength(1);
    expect(puts(request)[0][1]).toMatchObject({ method: 'PUT', body: { country: 'PE' } });
    expect(screen.getByText('País actual: Perú')).toBeInTheDocument();
    expect(onLocalizationChange).toHaveBeenCalledWith({ timeZone: 'America/Bogota', country: 'PE' });
    expect(screen.getByRole('button', { name: 'Revisar cambio' })).toBeDisabled();
  });

  it('U·country_note_only_when_the_country_changes: shown with a new country and not with a new zone alone', async () => {
    await open(service());
    expect(screen.queryByText(/solo se aplica a los plazos que se creen después/)).toBeNull();

    choose('Zona horaria', 'America/Lima');
    expect(screen.queryByText(/solo se aplica a los plazos que se creen después/)).toBeNull();
    choose('País', 'PE');
    expect(screen.getByText(/solo se aplica a los plazos que se creen después/)).toBeInTheDocument();
  });

  it('U·open_cash_is_explained_and_choice_is_kept: the cash text, the form back with what was chosen', async () => {
    await open(service(() => Promise.reject(failure(422, { code: 'BUSINESS_RULE_VIOLATION' }))));

    choose('Zona horaria', 'America/Lima');
    review();
    confirm();

    expect(await screen.findByText(text.openCash)).toBeInTheDocument();
    expect((screen.getByLabelText('Zona horaria') as HTMLSelectElement).value).toBe('America/Lima');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Revisar cambio' })).toBeEnabled();
  });

  it('U·cash_unreadable_is_explained_and_nothing_changed: the 503 text and a retry that sends the same change again', async () => {
    const request = service();
    let first = true;
    const flaky = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
      if (init?.method === 'PUT' && first) {
        first = false;
        throw failure(503);
      }
      return request(path, init);
    }) as unknown as ApiClient['request'];
    await open(flaky);

    choose('Zona horaria', 'America/Lima');
    review();
    confirm();
    expect(await screen.findByText(text.cashUnreadable)).toBeInTheDocument();
    expect(screen.getByText('Zona horaria actual: America/Bogota')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Cambio guardado. Rige desde ahora.')).toBeInTheDocument();
    expect(screen.getByText('Zona horaria actual: America/Lima')).toBeInTheDocument();
  });

  it('U·refusals_are_shown_like_the_other_screens: 403 as a line, a bad field beside its field and any failure with the trace', async () => {
    await open(service(() => Promise.reject(failure(403))));
    choose('País', 'PE');
    review();
    confirm();
    expect(await screen.findByText(text.forbidden)).toBeInTheDocument();

    cleanup();
    await open(service(() => Promise.reject(failure(400, { details: [{ field: 'timeZone', message: 'x' }] }))));
    choose('Zona horaria', 'America/Lima');
    review();
    confirm();
    const error = await screen.findByText(text.zoneShape);
    expect(screen.getByLabelText('Zona horaria').getAttribute('aria-describedby')).toBe(error.id);

    cleanup();
    await open(service(() => Promise.reject(failure(500, { traceId: 'trace-5' }))));
    choose('País', 'PE');
    review();
    confirm();
    expect(await screen.findByText(/trace-5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('U·while_sending_the_buttons_wait: "Guardando…" and nothing can be sent twice', async () => {
    let release: (tenant: unknown) => void = () => {};
    const request = service(() => new Promise((resolve) => (release = resolve)));
    await open(request);

    choose('País', 'PE');
    review();
    confirm();

    expect(await screen.findByText('Guardando…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar cambio' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    expect(puts(request)).toHaveLength(1);
    release({ ...tenant, country: 'PE' });
    await waitFor(() => expect(screen.getByText('Cambio guardado. Rige desde ahora.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Confirmar cambio' })).toBeNull();
  });

  it('U·both_fields_changed_are_shown_and_sent: two lines in the summary, both in the body, the container told once', async () => {
    const request = service();
    const { onLocalizationChange } = await open(request);

    choose('Zona horaria', 'America/Lima');
    choose('País', 'PE');
    review();
    expect(screen.getByText('Zona horaria: America/Bogota → America/Lima')).toBeInTheDocument();
    expect(screen.getByText('País: Colombia → Perú')).toBeInTheDocument();
    confirm();

    await screen.findByText('Cambio guardado. Rige desde ahora.');
    expect(puts(request)[0][1]).toMatchObject({ body: { timeZone: 'America/Lima', country: 'PE' } });
    expect(onLocalizationChange).toHaveBeenCalledTimes(1);
  });

  it('U·a_refusal_goes_away_when_the_person_chooses_again: the line and the field error of the earlier save are gone, the container was never told', async () => {
    const { onLocalizationChange } = await open(service(() => Promise.reject(failure(422))));

    choose('Zona horaria', 'America/Lima');
    review();
    confirm();
    expect(await screen.findByText(text.openCash)).toBeInTheDocument();
    choose('País', 'PE');

    expect(screen.queryByText(text.openCash)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect((screen.getByLabelText('Zona horaria') as HTMLSelectElement).value).toBe('America/Lima');
    expect(onLocalizationChange).not.toHaveBeenCalled();
  });

  it('U·the_saved_line_goes_away_when_the_person_chooses_again: it does not come back by choosing the current value', async () => {
    await open(service());

    choose('País', 'PE');
    review();
    confirm();
    await screen.findByText('Cambio guardado. Rige desde ahora.');
    choose('País', 'MX');
    expect(screen.queryByText('Cambio guardado. Rige desde ahora.')).toBeNull();
    choose('País', 'PE');
    expect(screen.queryByText('Cambio guardado. Rige desde ahora.')).toBeNull();
  });

  it('U·a_country_alone_refused_with_422_is_the_inactive_company: the screen path, with the choice kept', async () => {
    await open(service(() => Promise.reject(failure(422))));

    choose('País', 'PE');
    review();
    confirm();

    expect(await screen.findByText(text.inactive)).toBeInTheDocument();
    expect((screen.getByLabelText('País') as HTMLSelectElement).value).toBe('PE');
  });

  it('U·focus_follows_the_step: the summary takes it on the review and the line that says how it ended takes it back', async () => {
    await open(service(() => Promise.reject(failure(403))));

    choose('País', 'PE');
    review();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Revisa el cambio' }));
    confirm();

    const line = await screen.findByText(text.forbidden);
    await waitFor(() => expect(document.activeElement).toBe(line.parentElement));
  });

  it('U·a_country_the_list_lacks_still_shows_as_the_current_one: the select never starts on another country', async () => {
    await open(service(undefined, { ...tenant, country: 'AC' }));

    expect((screen.getByLabelText('País') as HTMLSelectElement).value).toBe('AC');
    expect(screen.getByRole('button', { name: 'Revisar cambio' })).toBeDisabled();
  });
});
