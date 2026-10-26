import type { ApiClient } from '../contract';

export interface RequestLinkScreenProps {
  identifier: string;
  apiClient: ApiClient;
  onSignIn: () => void;
}

// Skeleton: the test comes first (PV-01, plan D-05).
export function RequestLinkScreen(_props: RequestLinkScreenProps) {
  return null;
}
