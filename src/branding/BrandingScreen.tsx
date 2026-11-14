import type { ApiClient, Session } from '../contract';
import { TENANT_ADMINISTRATOR } from '../shell/roles';
import { ImageSlot } from './ImageSlot';
import { brandingMessages as text } from './messages';
import '../tenants/operator.css';
import './branding.css';

// A saved commercial image as the container read it from the public profile (api spec 012, RN-IDA-API-124).
export interface SavedImage {
  position: number;
  url: string;
}

export interface BrandingScreenProps {
  apiClient: ApiClient;
  session: Session;
  // What the container read from the public profile of the company; all optional, so an older container still works (spec 019, section 5).
  commercialName?: string;
  logoUrl?: string | null;
  images?: SavedImage[];
  // Called after a save or a removal of any place, so the container reads the profile again and shows the files without a reload.
  onTenantImagesChange?: () => void;
  onBack?: () => void;
}

const PLACES = [0, 1, 2, 3, 4];

// The Tenant Administrator chooses the logo and up to five commercial images of the company (portal spec 019). The role check hides the
// screen; the service refuses anyone else anyway (RN-IDA-PT-60). Each place works by itself and starts from what the container passes.
export function BrandingScreen({ apiClient, session, commercialName, logoUrl, images, onTenantImagesChange, onBack }: BrandingScreenProps) {
  if (!session.roles.includes(TENANT_ADMINISTRATOR)) return null;
  return (
    <main className="operator-content">
      <header className="operator-topbar">
        <div>
          <p className="operator-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          {commercialName && (
            <p className="branding-company">
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
      <p className="branding-note">{text.allowed}</p>
      <div className="branding-grid">
        <ImageSlot apiClient={apiClient} place={{ slot: 'logo' }} label="Logo" savedUrl={logoUrl ?? null} onChange={onTenantImagesChange} />
        {PLACES.map((position) => (
          <ImageSlot
            key={position}
            apiClient={apiClient}
            place={{ slot: 'image', position }}
            label={text.place(position + 1)}
            savedUrl={images?.find((image) => image.position === position)?.url ?? null}
            onChange={onTenantImagesChange}
          />
        ))}
      </div>
    </main>
  );
}
