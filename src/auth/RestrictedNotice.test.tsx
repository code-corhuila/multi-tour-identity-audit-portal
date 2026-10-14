import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { Session } from '../contract';
import { RestrictedNotice } from './RestrictedNotice';

it('restricted_session_sees_only_the_notice', () => {
  const session: Session = { roles: ['TENANT_ADMIN'], access: 'restricted', open: vi.fn(), close: vi.fn() };
  render(<RestrictedNotice session={session} />);
  expect(screen.getByText(/La empresa está inactiva/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(session.close).toHaveBeenCalledTimes(1);
});