// Stub of the container's contract (ADR-006 F4). Replaced by the type the container publishes once it exists.
export interface ApiClient {
  request<T>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal }): Promise<T>;
}

export interface Session {
  roles: string[];
  // Mark of the current token (G-2): a temporary credential or a restricted access; absent for a normal one.
  // The container's session must provide it and update it when a session opens or closes.
  access?: 'password-change' | 'restricted';
  // `identifier` is the company the answer is for; the container requires it in the general scope and ignores it in
  // the tenant and platform scopes.
  open(answer: unknown, identifier?: string): void;
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
  // Visual identity the container read from the public profile of the company; `null` means none was set. Both props
  // are optional so an older container still works (portal spec 005, section 5).
  visualIdentity?: VisualIdentity | null;
  // Called after the colors were saved, so the container applies them to the whole page without a reload.
  onVisualIdentityChange?: (visualIdentity: VisualIdentity) => void;
  apiClient: ApiClient;
  session: Session;
}

// `VisualIdentity` of identity-audit.yaml: the two colors of a company, written #RRGGBB.
export interface VisualIdentity {
  primaryColor: string;
  secondaryColor: string;
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
