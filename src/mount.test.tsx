import { act } from 'react';
import { expect, it } from 'vitest';
import { mount } from './mount';

it('mount renders the placeholder in the given element and unmounts it', async () => {
  const element = document.createElement('div');
  const props = {
    apiClient: { request: async () => ({}) as never },
    session: { roles: [], open: () => {}, close: () => {} },
  };
  let unmount = () => {};
  await act(async () => {
    unmount = mount(element, props);
  });
  expect(element).toHaveTextContent('Identity and audit portal');
  await act(async () => unmount());
  expect(element).toBeEmptyDOMElement();
});
