import type { ReactNode } from 'react';
import { messages } from '../messages';
import './theme.css';

export interface AuthCardProps {
  // A kicker marks the internal platform screen (dark panel, Mockup `admin-login.html`).
  kicker?: string;
  // Small label above the title of the customer screens ("Multi Tour" in the Mockup).
  eyebrow?: string;
  title: string;
  subtitle?: string;
  // The sign-up form is wider than the sign-in (Mockup `crear-cuenta.css`).
  wide?: boolean;
  // Where "Volver al inicio" goes; absent hides the link (the container owns the real routes).
  homeHref?: string;
  // Phrase over the photo; defaults to the one of the sign-in.
  visualTitle?: string;
  children: ReactNode;
}

// Split screen of the Mockup: visual panel on the left, the form column on the right.
export function AuthCard({ kicker, eyebrow, title, subtitle, wide, homeHref, visualTitle, children }: AuthCardProps) {
  const platform = kicker !== undefined;
  const text = messages.visual;
  const phrase = visualTitle ?? (platform ? text.platform : text.customer);
  return (
    <main className={platform ? 'auth-shell auth-shell--platform' : 'auth-shell'}>
      <aside className="auth-visual">
        {!platform && <img className="auth-visual-img" src={text.photo} alt={text.photoAlt} />}
        <div className="auth-visual-content">
          <span className="auth-visual-brand">{messages.brand}</span>
          {platform && <span className="auth-visual-chip">{text.chip}</span>}
          <p className="auth-visual-title">{phrase}</p>
        </div>
      </aside>
      <section className="auth-panel">
        <header className="auth-header">
          <span className="auth-brand">{messages.brand}</span>
          {homeHref && (
            <a className="auth-home" href={homeHref}>
              {text.home}
            </a>
          )}
        </header>
        <div className="auth-stage">
          <div className={wide ? 'auth-card auth-card--wide' : 'auth-card'}>
            <div className="auth-copy">
              {(kicker ?? eyebrow) && <p className="auth-kicker">{kicker ?? eyebrow}</p>}
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
