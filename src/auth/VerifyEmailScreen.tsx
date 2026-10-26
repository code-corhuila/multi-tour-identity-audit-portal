import type { ApiClient } from '../contract';

export interface VerifyEmailScreenProps {
  identifier: string;
  apiClient: ApiClient;
  // The value of the link, read once from the address; absent when the person opened the page without it.
  token?: string;
  onSignIn: () => void;
  onRequestLink: () => void;
}

// Skeleton: the test comes first (PV-02, plan D-05).
export function VerifyEmailScreen(_props: VerifyEmailScreenProps) {
  return null;
}
