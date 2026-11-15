import { tenantMessages as pager } from '../tenants/messages';

interface Props {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function AuditPager({ page, totalPages, onPage }: Props) {
  return (
    <nav className="platform-pages" aria-label={pager.pagination}>
      <button type="button" className="platform-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {pager.previous}
      </button>
      <span>{pager.pageOf(page, totalPages)}</span>
      <button type="button" className="platform-outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {pager.next}
      </button>
    </nav>
  );
}
