// Stub of the container's contract (ADR-006 F4). Replaced by the type the container publishes once it exists.
export interface ApiClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T>;
}

export interface Session {
  roles: string[];
  open(answer: unknown): void;
  close(): void;
}

export interface MountProps {
  apiClient: ApiClient;
  session: Session;
}

// Shape of the error the container's client rejects with (outline of ADR-006 F4, spec gap G-2).
export interface ApiError {
  status?: number;
  code?: string;
  traceId?: string;
}