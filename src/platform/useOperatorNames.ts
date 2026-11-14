import { useEffect, useState } from 'react';
import type { ApiClient } from '../contract';
import { listTenants } from '../data/tenants';

// The service gives a record only the identifier of its tenant, so the screen asks once for the first 100 tenants and
// keeps a map from identifier to commercial name (spec 014, RN-IDA-PT-22 and gap G-3: beyond 100 a tenant shows its identifier).
const NONE: ReadonlyMap<string, string> = new Map();
const LIMIT = 100;

export function useOperatorNames(apiClient: ApiClient): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(NONE);

  useEffect(() => {
    const controller = new AbortController();
    listTenants(apiClient, { page: 1, limit: LIMIT }, controller.signal)
      .then((answer) => {
        if (!controller.signal.aborted && Array.isArray(answer?.data)) setNames(new Map(answer.data.map((t) => [t.tenantId, t.commercialName])));
      })
      // A read that fails, or an answer that cannot be read, leaves the identifiers where the names would be: the table does not depend on it.
      .catch(() => {});
    return () => controller.abort();
  }, [apiClient]);

  return names;
}
