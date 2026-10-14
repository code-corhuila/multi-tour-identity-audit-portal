import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { show, unmountPortal } from './testkit';

afterEach(unmountPortal);

const sidebar = () => screen.getByRole('navigation', { name: 'Navegación del operador' });

// Spec 009 D-01 and RN-CAL-USR-01: the staff frame moves between Resumen and the collaborator views.
describe('staff frame navigation', () => {
  it('U·staff_item_opens_the_collaborators_list_and_summary_returns', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Colaboradores' }));
    expect(await screen.findByRole('heading', { name: 'Colaboradores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar colaborador' })).toBeInTheDocument();
    expect(within(sidebar()).getByRole('button', { name: 'Colaboradores' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Resumen' }));
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
  });

  it('U·list_opens_the_detail_and_goes_back', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Colaboradores' }));
    const [first] = await screen.findAllByRole('button', { name: /Ver detalle/ });
    fireEvent.click(first);
    expect(await screen.findByRole('heading', { name: 'Detalle del colaborador' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a colaboradores' }));
    expect(await screen.findByRole('heading', { name: 'Colaboradores' })).toBeInTheDocument();
  });

  it('U·list_opens_the_register_view_and_goes_back', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Colaboradores' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar colaborador' }));
    expect(screen.getByRole('heading', { name: 'Registrar colaborador' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a colaboradores' }));
    expect(await screen.findByRole('heading', { name: 'Colaboradores' })).toBeInTheDocument();
  });

  it('U·profile_is_reachable_from_the_frame_and_goes_back', async () => {
    await show(['TENANT_ADMINISTRATOR'], 'sierra-azul');
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Colaboradores' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mi perfil' }));
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Volver al panel' })[0]);
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
  });

  it('U·collaborator_sees_the_same_frame_without_the_collaborators_item', async () => {
    await show(['OPERATIONAL_COLLABORATOR'], 'sierra-azul');
    expect(screen.getByRole('heading', { name: 'Control de la operación' })).toBeInTheDocument();
    expect(within(sidebar()).getByRole('button', { name: 'Resumen' })).toBeInTheDocument();
    expect(within(sidebar()).queryByRole('button', { name: 'Colaboradores' })).not.toBeInTheDocument();
    expect(screen.getByText('Colaborador operativo')).toBeInTheDocument();
  });
});
