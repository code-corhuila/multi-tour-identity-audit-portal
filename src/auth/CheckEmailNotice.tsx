import type { ApiClient } from '../contract';

export interface CheckEmailNoticeProps {
  identifier: string;
  company: string;
  email: string;
  apiClient: ApiClient;
  onSignIn: () => void;
}

// Skeleton: the test comes first (PV-01, plan D-04).
export function CheckEmailNotice(_props: CheckEmailNoticeProps) {
  return null;
}
