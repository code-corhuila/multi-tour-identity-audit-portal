import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canReadTenantAudit } from './roles';
import { show, unmountPortal } from './testkit';

afterEach(unmountPortal);

// jsdom has no modal dialog: the audit screen mounts one, so the stub opens and closes it the way the browser does.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

const sidebar = () => screen.getByRole('navigation', { name: 'Navegación del operador' });

// Spec 015 RN-IDA-PT-36 and R3 (a): the entry "Auditoría" of the tenant.
describe('entry Auditoría of the tenant', () => {
  it('U·audit_entry_is_offered_only_to_the_roles_that_may_read_it: the Administrator, the Manager and the Analyst', async () => {
    for (const role of ['TENANT_ADMINISTRATOR', 'MANAGER', 'ANALYST']) {
      expect(canReadTenantAudit([role]), role).toBe(true);
      await show([role], 'sierra-azul');
      expect(within(sidebar()).getByRole('button', { name: 'Auditoría' }), role).toBeInTheDocument();
      await unmountPortal();
    }
    // the Accountant waits until the service gives it only the economic events (R3 (a), debt G-ACC); the Operational Collaborator
    // never reads it; the Final Customer has no frame at all
    for (const role of ['ACCOUNTANT', 'OPERATIONAL_COLLABORATOR']) {
      expect(canReadTenantAudit([role]), role).toBe(false);
      await show([role], 'sierra-azul');
      expect(within(sidebar()).queryByRole('button', { name: 'Auditoría' }), role).not.toBeInTheDocument();
      await unmountPortal();
    }
    expect(canReadTenantAudit(['FINAL_CUSTOMER'])).toBe(false);
    expect(canReadTenantAudit(['PLATFORM_ADMINISTRATOR'])).toBe(false);
    await show(['FINAL_CUSTOMER'], 'sierra-azul');
    expect(screen.queryByRole('button', { name: 'Auditoría' })).not.toBeInTheDocument();
  });

  it('U·audit_entry_opens_the_screen_with_the_note_of_who_reads: the Administrator and a role it enabled', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Auditoría' }));

    expect(await screen.findByRole('heading', { name: 'Auditoría del tenant', level: 1 })).toBeInTheDocument();
    expect(within(sidebar()).getByRole('button', { name: 'Auditoría' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText(/Tú decides qué roles de consulta acceden/)).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Resumen' }));
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    await unmountPortal();

    await show(['MANAGER'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText(/Acceso de solo consulta habilitado por el Administrador del tenant/)).toBeInTheDocument();
    // a role that reads the audit does not manage the collaborators
    expect(within(sidebar()).queryByRole('button', { name: 'Colaboradores' })).not.toBeInTheDocument();
  });
});
