import type { ApiClient, Session } from '../contract';

export interface SignInScreenProps {
  // Identifier of the company link; absent means the platform sign-in.
  identifier?: string;
  apiClient: ApiClient;
  session: Session;
}

export function SignInScreen(_props: SignInScreenProps) {
  return null;
}
