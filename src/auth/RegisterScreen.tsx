import type { ApiClient } from '../contract';
import { AuthCard } from '../ui/AuthCard';

export interface RegisterScreenProps {
  identifier: string;
  apiClient: ApiClient;
  // Called once the account exists; the caller sends the person to sign-in.
  onDone: () => void;
  onSignIn: () => void;
}

export function RegisterScreen(_props: RegisterScreenProps) {
  return <AuthCard title="">{null}</AuthCard>;
}
