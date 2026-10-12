const ATTRIBUTE = 'data-multi-tour-portal';
// Copied next to the module by the deployment script. Kept in a constant, not a literal in `new URL`, so Vite
// does not try to resolve it as an asset at build time.
const FILE = 'identity-audit-portal.css';

// The library build emits its CSS as a separate file next to the module and nothing else loads it, so the module
// links it itself, once per page. Same origin: the href is resolved from the module's own URL.
export function ensureStylesheet(): void {
  if (typeof document === 'undefined' || !document.head) return;
  if (document.head.querySelector(`link[${ATTRIBUTE}="identity-audit"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL(FILE, import.meta.url).href;
  link.setAttribute(ATTRIBUTE, 'identity-audit');
  document.head.appendChild(link);
}
