import { describe, expect, it } from 'vitest';
import { checkFile, LOGO_LIMIT, IMAGE_LIMIT } from './checkFile';

const file = (type: string, size: number) => new File([new Uint8Array(size)], 'f', { type });

describe('the check of a file in the browser (portal spec 019, RN-IDA-PT-62)', () => {
  it('U·a_wrong_kind_is_refused_in_the_browser: only PNG, JPEG and WebP', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(checkFile(file(type, 10), 'logo')).toBe('ok');
      expect(checkFile(file(type, 10), 'image')).toBe('ok');
    }
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', 'text/html', '']) {
      expect(checkFile(file(type, 10), 'logo')).toBe('kind');
      expect(checkFile(file(type, 10), 'image')).toBe('kind');
    }
  });

  it('U·a_big_file_is_refused_in_the_browser: 256 KB for the logo and 1 MB for an image, the limit itself allowed', () => {
    expect(LOGO_LIMIT).toBe(256 * 1024);
    expect(IMAGE_LIMIT).toBe(1024 * 1024);
    expect(checkFile(file('image/png', LOGO_LIMIT), 'logo')).toBe('ok');
    expect(checkFile(file('image/png', LOGO_LIMIT + 1), 'logo')).toBe('size');
    expect(checkFile(file('image/png', IMAGE_LIMIT), 'image')).toBe('ok');
    expect(checkFile(file('image/png', IMAGE_LIMIT + 1), 'image')).toBe('size');
    expect(checkFile(file('image/png', LOGO_LIMIT + 1), 'image')).toBe('ok');
  });

  it('an empty file is not a picture and says so apart from a big one', () => {
    expect(checkFile(file('image/png', 0), 'logo')).toBe('empty');
    expect(checkFile(file('image/png', 0), 'image')).toBe('empty');
  });

  it('the kind is judged before the size', () => {
    expect(checkFile(file('image/gif', LOGO_LIMIT + 1), 'logo')).toBe('kind');
  });
});
