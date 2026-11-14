import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { ImageSlot } from './ImageSlot';
import { brandingMessages as text } from './messages';

const failure = (status: number, extra = {}) => Object.assign(new Error('x'), { status, ...extra });
const png = (size = 10, name = 'logo.png') => new File([new Uint8Array(size)], name, { type: 'image/png' });
const clientOf = (request: unknown) => ({ request }) as unknown as ApiClient;

let created = 0;
let revoked: string[] = [];
beforeEach(() => {
  created = 0;
  revoked = [];
  URL.createObjectURL = vi.fn(() => `blob:preview-${++created}`);
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});
afterEach(cleanup);

function show(request: unknown, props: Partial<Parameters<typeof ImageSlot>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <ImageSlot apiClient={clientOf(request)} place={{ slot: 'logo' }} label="Logo" savedUrl={null} onChange={onChange} {...props} />,
  );
  return { onChange, ...utils };
}
const input = () => screen.getByLabelText(text.chooseLogo) as HTMLInputElement;
const pick = (file: File) => fireEvent.change(input(), { target: { files: [file] } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('one place of the logo and images screen (portal spec 019, RN-IDA-PT-61, -63, -65, -67, -68, -69)', () => {
  it('U·places_start_with_the_saved_files and U·a_tenant_without_files_shows_the_default_note', () => {
    const { unmount } = show(vi.fn(), { savedUrl: '/api/v1/identity-audit/public/tenants/acme/logo?v=abcd1234' });
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/api/v1/identity-audit/public/tenants/acme/logo?v=abcd1234');
    expect(screen.getByRole('button', { name: text.removeLogo })).toBeInTheDocument();
    unmount();
    show(vi.fn());
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(text.noLogo)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: text.removeLogo })).toBeNull();
  });

  it('U·a_chosen_file_is_previewed_and_not_sent: the preview shows and nothing goes to the service before "Guardar"', () => {
    const request = vi.fn();
    show(request);
    expect(screen.getByRole('button', { name: text.saveLogo })).toBeDisabled();
    pick(png());
    expect(screen.getByRole('img', { name: /Vista previa/ })).toHaveAttribute('src', 'blob:preview-1');
    expect(screen.getByRole('button', { name: text.saveLogo })).toBeEnabled();
    expect(request).not.toHaveBeenCalled();
  });

  it('U·a_wrong_kind_is_refused_in_the_browser and U·a_big_file_is_refused_in_the_browser: its own text, no preview, nothing sent', () => {
    const request = vi.fn();
    show(request);
    pick(new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' }));
    expect(screen.getByText(text.wrongKind)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Vista previa/ })).toBeNull();
    expect(screen.getByRole('button', { name: text.saveLogo })).toBeDisabled();
    pick(png(256 * 1024 + 1));
    expect(screen.getByText(text.tooBigHere)).toBeInTheDocument();
    pick(png(0));
    expect(screen.getByText(text.emptyFile)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('U·save_sends_one_request_for_one_place and U·a_saved_file_shows_and_tells_the_container: the place shows the new file and the container is told', async () => {
    const request = vi.fn(async () => ({}));
    const { onChange } = show(request, { place: { slot: 'image', position: 2 }, label: 'Imagen 3' });
    fireEvent.change(screen.getByLabelText(text.chooseImage), { target: { files: [png(20, 'photo.png')] } });
    click(text.saveImage);
    await screen.findByText(text.saved);
    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0] as unknown as [string, { method: string; body: { contentType: string } }];
    expect(path).toBe('/api/v1/identity-audit/tenant/images/2');
    expect(init.method).toBe('PUT');
    expect(init.body.contentType).toBe('image/png');
    expect(screen.getByRole('img', { name: 'Imagen 3' })).toHaveAttribute('src', 'blob:preview-1');
    expect(screen.getByRole('button', { name: text.saveImage })).toBeDisabled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('while it is sending the buttons are disabled and it says so', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const request = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    show(request);
    pick(png());
    click(text.saveLogo);
    await screen.findByText(text.sending);
    expect(screen.getByRole('button', { name: text.saveLogo })).toBeDisabled();
    // the request is made once the file has been read; only then can it be answered
    await waitFor(() => expect(request).toHaveBeenCalled());
    finish({});
    await screen.findByText(text.saved);
  });

  it('U·removing_asks_first, U·cancel_sends_nothing and U·a_removed_place_shows_the_default_note', async () => {
    const request = vi.fn(async () => undefined);
    const { onChange } = show(request, { savedUrl: '/api/v1/identity-audit/public/tenants/acme/logo?v=abcd1234' });
    click(text.removeLogo);
    expect(screen.getByText(text.confirmRemove)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    click(text.cancel);
    expect(screen.queryByText(text.confirmRemove)).toBeNull();
    expect(request).not.toHaveBeenCalled();
    click(text.removeLogo);
    click(text.remove);
    await screen.findByText(text.noLogo);
    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0] as unknown as [string, { method: string }];
    expect(path).toBe('/api/v1/identity-audit/tenant/logo');
    expect(init.method).toBe('DELETE');
    expect(screen.queryByRole('img')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('U·a_refused_file_keeps_the_saved_one and U·refusals_are_shown_with_their_text: the saved file and the choice stay on screen', async () => {
    const cases: Array<[number, string]> = [[413, text.tooBig], [400, text.fileRefused], [422, text.inactive], [403, text.forbidden]];
    for (const [status, line] of cases) {
      const request = vi.fn(async () => Promise.reject(failure(status)));
      const { unmount } = show(request, { savedUrl: '/saved.png' });
      pick(png());
      click(text.saveLogo);
      await screen.findByText(line);
      expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/saved.png');
      expect(screen.getByRole('img', { name: /Vista previa/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.retry })).toBeNull();
      unmount();
    }
  });

  it('a failure of the network may be tried again and the retry sends the same file', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(failure(503))
      .mockResolvedValueOnce({});
    show(request);
    pick(png());
    click(text.saveLogo);
    fireEvent.click(await screen.findByRole('button', { name: text.retry }));
    await screen.findByText(text.saved);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('a failed removal keeps the picture, says why, does not tell the container, and its retry sends the removal again', async () => {
    const request = vi.fn().mockRejectedValueOnce(failure(503)).mockResolvedValueOnce(undefined);
    const { onChange } = show(request, { savedUrl: '/saved.png' });
    click(text.removeLogo);
    click(text.remove);
    fireEvent.click(await screen.findByRole('button', { name: text.retry }));
    await screen.findByText(text.noLogo);
    expect(request).toHaveBeenCalledTimes(2);
    expect((request.mock.calls[1] as unknown as [string, { method: string }])[1].method).toBe('DELETE');
    expect(onChange).toHaveBeenCalledTimes(1);
    const refused = vi.fn(async () => Promise.reject(failure(403)));
    cleanup();
    const second = show(refused, { savedUrl: '/saved.png' });
    click(text.removeLogo);
    click(text.remove);
    await screen.findByText(text.forbidden);
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/saved.png');
    expect(second.onChange).not.toHaveBeenCalled();
  });

  it('choosing another file clears the refusal, a refused file drops the earlier preview and a cancelled dialog clears the choice', async () => {
    const request = vi.fn(async () => Promise.reject(failure(413)));
    show(request);
    pick(png());
    click(text.saveLogo);
    await screen.findByText(text.tooBig);
    pick(png(20));
    expect(screen.queryByText(text.tooBig)).toBeNull();
    pick(new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' }));
    expect(screen.queryByRole('img', { name: /Vista previa/ })).toBeNull();
    pick(png());
    expect(screen.getByRole('img', { name: /Vista previa/ })).toBeInTheDocument();
    fireEvent.change(input(), { target: { files: [] } });
    expect(screen.queryByRole('img', { name: /Vista previa/ })).toBeNull();
    expect(screen.getByRole('button', { name: text.saveLogo })).toBeDisabled();
  });

  it('a replaced saved file is released and the limit of an image is 1 MB, not the 256 KB of the logo', async () => {
    const request = vi.fn(async () => ({}));
    show(request, { place: { slot: 'image', position: 0 }, label: 'Imagen 1' });
    const chooser = screen.getByLabelText(text.chooseImage);
    fireEvent.change(chooser, { target: { files: [png(300 * 1024)] } });
    expect(screen.queryByText(text.tooBigHere)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: text.saveImage }));
    await screen.findByText(text.saved);
    fireEvent.change(chooser, { target: { files: [png(20)] } });
    fireEvent.click(screen.getByRole('button', { name: text.saveImage }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(revoked).toContain('blob:preview-1'));
    fireEvent.change(chooser, { target: { files: [png(1024 * 1024 + 1)] } });
    expect(screen.getByText(text.tooBigHere)).toBeInTheDocument();
  });

  it('the place is a named group, the focus goes to the question when removing asks and to the messages when it ends', async () => {
    const request = vi.fn(async () => undefined);
    show(request, { savedUrl: '/saved.png' });
    expect(screen.getByRole('group', { name: 'Logo' })).toBeInTheDocument();
    click(text.removeLogo);
    await waitFor(() => expect(screen.getByRole('group', { name: text.removeLogo })).toHaveFocus());
    click(text.cancel);
    expect(document.activeElement?.getAttribute('aria-live')).toBe('polite');
    click(text.removeLogo);
    click(text.remove);
    await screen.findByText(text.noLogo);
    expect(document.activeElement?.getAttribute('aria-live')).toBe('polite');
  });

  it('U·places_are_independent: two places do not share a file or a state', async () => {
    const request = vi.fn(async () => ({}));
    render(
      <>
        <ImageSlot apiClient={clientOf(request)} place={{ slot: 'image', position: 0 }} label="Imagen 1" savedUrl="/one.png" />
        <ImageSlot apiClient={clientOf(request)} place={{ slot: 'image', position: 1 }} label="Imagen 2" savedUrl={null} />
      </>,
    );
    const inputs = screen.getAllByLabelText(text.chooseImage);
    fireEvent.change(inputs[1]!, { target: { files: [png()] } });
    fireEvent.click(screen.getAllByRole('button', { name: text.saveImage })[1]!);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect((request.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/identity-audit/tenant/images/1');
    expect(screen.getByRole('img', { name: 'Imagen 1' })).toHaveAttribute('src', '/one.png');
  });

  it('the preview is released when the file changes and when the place goes away', () => {
    const { unmount } = show(vi.fn());
    pick(png());
    pick(png(20));
    expect(revoked).toEqual(['blob:preview-1']);
    unmount();
    expect(revoked).toEqual(['blob:preview-1', 'blob:preview-2']);
  });
});
