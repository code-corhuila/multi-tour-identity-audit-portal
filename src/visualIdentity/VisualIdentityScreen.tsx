import { useState, type CSSProperties, type FormEvent } from 'react';
import type { ApiClient, Session, VisualIdentity } from '../contract';
import { TENANT_ADMINISTRATOR } from '../shell/roles';
import { ColorField } from './ColorField';
import { DEFAULT_COLORS, visualIdentityMessages as text } from './messages';
import { useSetVisualIdentity } from './useSetVisualIdentity';
import { HEX_COLOR } from './visualIdentityApi';
import '../tenants/operator.css';
import './visualIdentity.css';

export interface VisualIdentityScreenProps {
  apiClient: ApiClient;
  session: Session;
  // Name of the company, as read-only context.
  commercialName?: string;
  // Saved colors as the container read them; `null` or absent means the company has none (defaults and the note).
  visualIdentity?: VisualIdentity | null;
  // The container is still resolving the company.
  loading?: boolean;
  // Called once after a good save, so the container applies the colors to the whole page.
  onVisualIdentityChange?: (visualIdentity: VisualIdentity) => void;
  onBack?: () => void;
}

// Colors of the preview: the last valid value of each field, so a half-typed one does not flash.
function useLastValid(value: string, fallback: string): string {
  const [last, setLast] = useState(fallback);
  if (HEX_COLOR.test(value) && value !== last) setLast(value);
  return HEX_COLOR.test(value) ? value : last;
}

// The Tenant Administrator picks the two colors of the company, sees them live and saves them (portal spec 005).
// The role check hides the screen; the service refuses anyone else anyway (RN-IDA-PT-10). The form is mounted only
// once the container has resolved the company (not while `loading`), so its fields never start from stale defaults.
export function VisualIdentityScreen({ session, loading = false, ...rest }: VisualIdentityScreenProps) {
  if (!session.roles.includes(TENANT_ADMINISTRATOR)) return null;
  if (loading) {
    return (
      <main className="operator-content">
        <p role="status">{text.loading}</p>
      </main>
    );
  }
  return <VisualIdentityForm {...rest} />;
}

type FormProps = Omit<VisualIdentityScreenProps, 'session' | 'loading'>;

function VisualIdentityForm({ apiClient, commercialName, visualIdentity, onVisualIdentityChange, onBack }: FormProps) {
  const initial = visualIdentity ?? DEFAULT_COLORS;
  const [primary, setPrimary] = useState(initial.primaryColor);
  const [secondary, setSecondary] = useState(initial.secondaryColor);
  const [local, setLocal] = useState<Partial<Record<keyof VisualIdentity, string>>>({});
  const { sending, failure, saved, submit } = useSetVisualIdentity(apiClient);
  const previewPrimary = useLastValid(primary, initial.primaryColor);
  const previewSecondary = useLastValid(secondary, initial.secondaryColor);

  const errors = { primaryColor: local.primaryColor ?? failure?.fields.primaryColor, secondaryColor: local.secondaryColor ?? failure?.fields.secondaryColor };

  async function save() {
    const found = {
      primaryColor: HEX_COLOR.test(primary) ? undefined : text.colorShape,
      secondaryColor: HEX_COLOR.test(secondary) ? undefined : text.colorShape,
    };
    setLocal(found);
    if (found.primaryColor || found.secondaryColor) return;
    const stored = await submit({ primaryColor: primary, secondaryColor: secondary });
    if (stored) onVisualIdentityChange?.(stored);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  // The colors reach the preview box only: the page is painted by the container after the save.
  const previewStyle = { '--accent': previewPrimary, '--accent-strong': previewSecondary } as CSSProperties;
  return (
    <main className="operator-content">
      <header className="operator-topbar">
        <div>
          <p className="operator-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          {commercialName && (
            <p className="visual-identity-company">
              {text.company}: <strong>{commercialName}</strong>
            </p>
          )}
        </div>
        {onBack && (
          <button type="button" className="operator-outline" onClick={onBack}>
            {text.back}
          </button>
        )}
      </header>
      <section className="operator-panel">
        {visualIdentity == null && <p className="visual-identity-note">{text.defaultsNote}</p>}
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <ColorField id="visual-primary" label={text.primary} value={primary} error={errors.primaryColor} onChange={(v) => { setPrimary(v); setLocal({ ...local, primaryColor: undefined }); }} />
          <ColorField id="visual-secondary" label={text.secondary} value={secondary} error={errors.secondaryColor} onChange={(v) => { setSecondary(v); setLocal({ ...local, secondaryColor: undefined }); }} />
          <div className="visual-identity-preview" data-testid="visual-identity-preview" style={previewStyle} aria-label={text.preview} role="group">
            <p className="operator-eyebrow">{text.preview}</p>
            <h2>{text.previewHeading}</h2>
            <div className="visual-identity-preview-actions">
              <span className="visual-identity-preview-primary">{text.previewPrimary}</span>
              <span className="visual-identity-preview-outline">{text.previewOutline}</span>
            </div>
          </div>
          <div aria-live="polite">
            {failure?.line && (
              <div role="alert" className="operator-error">
                <p>{failure.line}</p>
                <button type="button" className="operator-outline" onClick={() => void save()}>
                  {text.retry}
                </button>
              </div>
            )}
            {saved && <p className="auth-feedback is-success">{text.saved}</p>}
          </div>
          <button className="operator-primary" type="submit" disabled={sending}>
            {sending ? text.sending : text.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
