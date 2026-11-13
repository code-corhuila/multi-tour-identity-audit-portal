import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient, Session } from '../contract';
import { BrandingScreen } from './BrandingScreen';
import { brandingMessages as text } from './messages';

const admin: Session = { roles: ['TENANT_ADMINISTRATOR'], open: vi.fn(), close: vi.fn() };
const png = (size = 10) => new File([new Uint8Array(size)], 'a.png', { type: 'image/png' });
const clientOf = (request: unknown) => ({ request }) as unknown as ApiClient;

beforeEach(() => {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('the logo and images screen (portal spec 019, RN-IDA-PT-60, -61, -66, -67, -69)', () => {
  it('U·images_screen_is_for_the_tenant_administrator_only: any other role sees nothing', () => {
    for (const roles of [['MANAGER'], ['OPERATIONAL_COLLABORATOR'], ['PLATFORM_ADMINISTRATOR'], ['FINAL_CUSTOMER'], []]) {
      const { container, unmount } = render(<BrandingScreen apiClient={clientOf(vi.fn())} session={{ ...admin, roles }} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('shows its header, the company as context, the allowed files and a way back', () => {
    const onBack = vi.fn();
    render(<BrandingScreen apiClient={clientOf(vi.fn())} session={admin} commercialName="Acme Tours" onBack={onBack} />);
    expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument();
    expect(screen.getByText(text.eyebrow)).toBeInTheDocument();
    expect(screen.getByText('Acme Tours')).toBeInTheDocument();
    expect(screen.getByText(text.allowed)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: text.back }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('U·places_start_with_the_saved_files and U·a_tenant_without_files_shows_the_default_note: the logo and five images, each with its own file', () => {
    const { unmount } = render(<BrandingScreen apiClient={clientOf(vi.fn())} session={admin} />);
    expect(screen.getByRole('group', { name: 'Logo' })).toBeInTheDocument();
    for (let n = 1; n <= 5; n += 1) expect(screen.getByRole('group', { name: text.place(n) })).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(text.noLogo)).toBeInTheDocument();
    expect(screen.getAllByText(text.noImage)).toHaveLength(5);
    unmount();
    render(
      <BrandingScreen
        apiClient={clientOf(vi.fn())}
        session={admin}
        logoUrl="/logo.png?v=1"
        images={[{ position: 0, url: '/one.png?v=1' }, { position: 3, url: '/four.png?v=1' }]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/logo.png?v=1');
    expect(screen.getByRole('img', { name: text.place(1) })).toHaveAttribute('src', '/one.png?v=1');
    expect(screen.getByRole('img', { name: text.place(4) })).toHaveAttribute('src', '/four.png?v=1');
    expect(screen.queryByRole('img', { name: text.place(2) })).toBeNull();
  });

  it('U·places_are_independent and U·a_saved_file_shows_and_tells_the_container: saving one image goes to its position and tells the container once', async () => {
    const request = vi.fn(async () => ({}));
    const onTenantImagesChange = vi.fn();
    render(<BrandingScreen apiClient={clientOf(request)} session={admin} onTenantImagesChange={onTenantImagesChange} logoUrl="/logo.png?v=1" />);
    const third = screen.getByRole('group', { name: text.place(3) });
    fireEvent.change(within(third).getByLabelText(text.chooseImage), { target: { files: [png()] } });
    fireEvent.click(within(third).getByRole('button', { name: text.saveImage }));
    await waitFor(() => expect(onTenantImagesChange).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledTimes(1);
    expect((request.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/identity-audit/tenant/images/2');
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/logo.png?v=1');
    expect(within(screen.getByRole('group', { name: text.place(1) })).queryByText(text.saved)).toBeNull();
  });

  it('the places keep the order of their positions, a late profile fills the places that were not touched, and the ends map to the routes 0 and 4', async () => {
    const request = vi.fn(async () => ({}));
    const onTenantImagesChange = vi.fn();
    const { rerender } = render(<BrandingScreen apiClient={clientOf(request)} session={admin} onTenantImagesChange={onTenantImagesChange} />);
    expect(screen.queryByRole('img')).toBeNull();
    rerender(
      <BrandingScreen
        apiClient={clientOf(request)}
        session={admin}
        onTenantImagesChange={onTenantImagesChange}
        logoUrl="/logo.png?v=1"
        images={[{ position: 4, url: '/five.png?v=1' }, { position: 0, url: '/one.png?v=1' }]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute('src', '/logo.png?v=1');
    expect(screen.getByRole('img', { name: text.place(1) })).toHaveAttribute('src', '/one.png?v=1');
    expect(screen.getByRole('img', { name: text.place(5) })).toHaveAttribute('src', '/five.png?v=1');
    for (const [place, route] of [[1, 0], [5, 4]] as const) {
      const group = screen.getByRole('group', { name: text.place(place) });
      fireEvent.change(within(group).getByLabelText(text.chooseImage), { target: { files: [png()] } });
      fireEvent.click(within(group).getByRole('button', { name: text.saveImage }));
      await waitFor(() => expect(request.mock.calls.some((call) => (call as unknown as [string])[0] === `/api/v1/identity-audit/tenant/images/${route}`)).toBe(true));
    }
    // a place that the person already saved keeps the file that was sent, even if the container then passes another address
    await waitFor(() => expect(onTenantImagesChange).toHaveBeenCalledTimes(2));
    const sent = screen.getByRole('img', { name: text.place(1) }).getAttribute('src');
    rerender(
      <BrandingScreen apiClient={clientOf(request)} session={admin} onTenantImagesChange={onTenantImagesChange} images={[{ position: 0, url: '/other.png?v=2' }]} />,
    );
    expect(screen.getByRole('img', { name: text.place(1) })).toHaveAttribute('src', sent ?? '');
  });

  it('the headings go in order, the container is told after a removal, and a chosen file of another place stays', async () => {
    const request = vi.fn(async () => undefined);
    const onTenantImagesChange = vi.fn();
    render(<BrandingScreen apiClient={clientOf(request)} session={admin} logoUrl="/logo.png?v=1" onTenantImagesChange={onTenantImagesChange} />);
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
    const second = screen.getByRole('group', { name: text.place(2) });
    fireEvent.change(within(second).getByLabelText(text.chooseImage), { target: { files: [png()] } });
    fireEvent.click(screen.getByRole('button', { name: text.removeLogo }));
    fireEvent.click(screen.getByRole('button', { name: text.remove }));
    await waitFor(() => expect(onTenantImagesChange).toHaveBeenCalledTimes(1));
    expect(within(second).getByRole('img', { name: /Vista previa/ })).toBeInTheDocument();
  });

  it('U·a_container_without_the_callback_still_works: saving and removing need no callback', async () => {
    const request = vi.fn(async () => ({}));
    render(<BrandingScreen apiClient={clientOf(request)} session={admin} logoUrl="/logo.png?v=1" />);
    fireEvent.click(screen.getByRole('button', { name: text.removeLogo }));
    fireEvent.click(screen.getByRole('button', { name: text.remove }));
    await screen.findByText(text.noLogo);
    expect((request.mock.calls[0] as unknown as [string, { method: string }])[1].method).toBe('DELETE');
  });
});
