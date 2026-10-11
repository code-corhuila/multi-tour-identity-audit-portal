// Stub of the container's contract (ADR-006 F4). Replaced by the type the container publishes once it exists.
export interface ApiClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T>;
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
  apiClient: ApiClient;
  session: Session;
}

// Shape of the error the container's client rejects with (outline of ADR-006 F4, spec gap G-2).
export interface ApiError {
  status?: number;
  code?: string;
  traceId?: string;
}
