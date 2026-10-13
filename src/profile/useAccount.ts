import type { Session } from '../contract';
import { profileMessages } from './messages';

export interface Account {
  name?: string;
  email?: string;
  phone?: string;
  role: string;
}

// The account is what the container's session carries; the portal keeps no copy of a person (norm 5.4.1). A session
// with no role is not a signed-in one: there is nothing to show.
export function useAccount(session: Session): Account | undefined {
  const [first] = session.roles;
  if (first === undefined) return undefined;
  return { ...session.account, role: profileMessages.roles[first] ?? first };
}
