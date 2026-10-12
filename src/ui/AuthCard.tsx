import type { ReactNode } from 'react';
import { messages } from '../messages';
import './theme.css';

export interface AuthCardProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  // The sign-up form is wider than the sign-in (Mockup `crear-cuenta.css`).
  wide?: boolean;
  children: ReactNode;
}

// A kicker marks the internal platform card, which is narrower (Mockup `travel-platform-login-card`).
export function AuthCard({ kicker, title, subtitle, wide, children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <header className="auth-header">
        <span className="auth-brand">{messages.brand}</span>
      </header>
      <section className="auth-stage">
        <div className={['auth-card', kicker && 'auth-card--platform', wide && 'auth-card--wide'].filter(Boolean).join(' ')}>
          <div className="auth-copy">
            {kicker && <p className="auth-kicker">{kicker}</p>}
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
