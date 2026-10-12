// Stub of the container's contract (ADR-006 F4). Replaced by the type the container publishes once it exists.
export interface ApiClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal }): Promise<T>;
}

export interface Session {
  roles: string[];
  // Mark of the current token (G-2): a temporary credential or a restricted access; absent for a normal one.
  // The container's session must provide it and update it when a session opens or closes.
  access?: 'password-change' | 'restricted';
  open(answer: unknown): void;
  close(): void;
}

export interface MountProps {
  // Identifier of the company link; absent means the platform sign-in. The container must provide it.
  identifier?: string;
  // 'general': the company is typed on the sign-in; 'platform': the platform sign-in and shell; 'tenant': the company
  // comes from `identifier`. Absent keeps the older rule (no identifier means platform).
  scope?: Scope;
  // SPA navigation owned by the container; absent (older container) leaves every link as a plain anchor.
  navigate?: (path: string) => void;
  apiClient: ApiClient;
  session: Session;
}

export type Scope = 'general' | 'platform' | 'tenant';

// Shape of the error the container's client rejects with (outline of ADR-006 F4, spec gap G-2).
export interface ApiError {
  status?: number;
  code?: string;
  traceId?: string;
  // Field-level problems of a 400 (the shared error envelope); the container's client must pass them through.
  details?: { field: string; message: string }[];
}
