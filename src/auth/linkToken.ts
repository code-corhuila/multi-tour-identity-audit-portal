export const VERIFY_PATH = 'verificar-correo';

// 32 random bytes in base64url, as the service issues them.
const LINK_VALUE = /^[A-Za-z0-9_-]{43}$/;

// The link travels in the fragment, so it never reaches a server log. It is read once and taken out of the address and
// the history, whether or not it was well formed.
export function readLinkToken(): string | undefined {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith('#token=')) return undefined;
  window.history.replaceState(null, '', pathname + search);
  const value = hash.slice('#token='.length);
  return LINK_VALUE.test(value) ? value : undefined;
}
