// What the browser checks of a chosen file before sending anything (portal spec 019, D-04). It is a courtesy: the service proves the kind
// by the bytes and decides again, so these values mirror api spec 012 (RN-IDA-API-121) and are written twice on purpose (gap G-4).
export const LOGO_LIMIT = 256 * 1024;
export const IMAGE_LIMIT = 1024 * 1024;

const KINDS = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type Slot = 'logo' | 'image';
export type FileCheck = 'ok' | 'kind' | 'size' | 'empty';

// The kind is judged before the size; a file with nothing in it is its own answer, not a big one.
export function checkFile(file: File, slot: Slot): FileCheck {
  if (!KINDS.has(file.type)) return 'kind';
  const limit = slot === 'logo' ? LOGO_LIMIT : IMAGE_LIMIT;
  if (file.size < 1) return 'empty';
  return file.size > limit ? 'size' : 'ok';
}
