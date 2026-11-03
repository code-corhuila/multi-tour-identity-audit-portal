import type { ApiError } from './contract';

// The container's client rejects with an object shaped like `ApiError`; anything else that was thrown (null, a string, a function)
// carries no status or trace, so it reads as an empty one. The only cast of the portal for this lives here.
export function toApiError(error: unknown): ApiError {
  return typeof error === 'object' && error !== null ? (error as ApiError) : {};
}
