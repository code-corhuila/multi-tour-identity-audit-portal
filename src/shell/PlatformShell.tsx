import { useState } from 'react';
import type { ApiClient, Session } from '../contract';
import { AuditView } from '../platform/AuditView';
import { CreateOperatorView } from '../platform/CreateOperatorView';
import { OperatorDetailView } from '../platform/OperatorDetailView';
import { OperatorsView } from '../platform/OperatorsView';
import { PlatformFrame, type PlatformItem } from '../platform/PlatformFrame';
import { SummaryView } from '../platform/SummaryView';
import { PLATFORM_ADMINISTRATOR } from './roles';

// Pages of the panel: the three sidebar items plus the two that hang from the operators list (create and detail).
type Page = { kind: PlatformItem } | { kind: 'create' } | { kind: 'detail'; tenantId: string };

// Shell of the Platform Administrator (Mockup admin-plataforma.html): the left sidebar frame and its five views.
export function PlatformShell({ apiClient, session, onSignOut }: { apiClient: ApiClient; session: Session; onSignOut: () => void }) {
  const [page, setPage] = useState<Page>({ kind: 'summary' });
  if (!session.roles.includes(PLATFORM_ADMINISTRATOR)) return null;
  const toOperators = () => setPage({ kind: 'operators' });
  const toCreate = () => setPage({ kind: 'create' });
  // Create and detail are children of "Operadores" in the sidebar.
  const current: PlatformItem = page.kind === 'create' || page.kind === 'detail' ? 'operators' : page.kind;

  return (
    <PlatformFrame current={current} onNavigate={(item) => setPage({ kind: item })} onSignOut={onSignOut}>
      {page.kind === 'summary' && <SummaryView apiClient={apiClient} onCreate={toCreate} onSeeAll={toOperators} />}
      {page.kind === 'operators' && <OperatorsView apiClient={apiClient} onCreate={toCreate} onOpen={(tenantId) => setPage({ kind: 'detail', tenantId })} />}
      {page.kind === 'create' && <CreateOperatorView apiClient={apiClient} onBack={toOperators} />}
      {page.kind === 'detail' && <OperatorDetailView apiClient={apiClient} tenantId={page.tenantId} onBack={toOperators} />}
      {page.kind === 'audit' && <AuditView />}
    </PlatformFrame>
  );
}
