import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../mount';

const links = () => Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
const unmounts: (() => void)[] = [];

async function show() {
  const element = document.body.appendChild(document.createElement('div'));
  const apiClient = { request: vi.fn().mockResolvedValue(undefined) };
  const session = { roles: [], open: vi.fn(), close: vi.fn() };
  await act(async () => {
    unmounts.push(mount(element, { apiClient, session, identifier: 'acme' }));
  });
}

afterEach(async () => {
  await act(async () => unmounts.splice(0).forEach((u) => u()));
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('the portal loads its own stylesheet', () => {
  it('a mount adds one stylesheet link next to the module, with the portal file name', async () => {
    await show();
    expect(links()).toHaveLength(1);
    const href = new URL(links()[0].href);
    expect(href.pathname.endsWith('/identity-audit-portal.css')).toBe(true);
  });

  it('a second mount does not add another link', async () => {
    await show();
    await show();
    expect(links()).toHaveLength(1);
  });
});
