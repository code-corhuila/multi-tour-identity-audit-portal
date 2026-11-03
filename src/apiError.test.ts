import { describe, expect, it } from 'vitest';
import { toApiError } from './apiError';

describe('toApiError', () => {
  it('keeps_the_status_trace_and_details_of_what_the_container_client_rejects_with', () => {
    const rejected = Object.assign(new Error('x'), { status: 400, traceId: 't-1', details: [{ field: 'email', message: 'bad' }] });
    const read = toApiError(rejected);
    expect(read.status).toBe(400);
    expect(read.traceId).toBe('t-1');
    expect(read.details).toEqual([{ field: 'email', message: 'bad' }]);
  });

  it('reads_anything_that_is_not_an_object_as_no_information: null, undefined, a string, a number', () => {
    for (const rejected of [null, undefined, 'boom', 42]) {
      expect(toApiError(rejected)).toEqual({});
    }
  });
});
