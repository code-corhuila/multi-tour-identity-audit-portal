import type { ApiClient, Session } from '../contract';

export interface FirstPasswordScreenProps {
  apiClient: ApiClient;
  session: Session;
  onSaved: () => void;
}

export function FirstPasswordScreen(_props: FirstPasswordScreenProps) {
  return null;
}