import type { ReactNode } from 'react';
import { messages } from '../messages';
import './theme.css';

export interface AuthCardProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// A kicker marks the internal platform card, which is narrower (Mockup `travel-platform-login-card`).
export function AuthCard({ kicker, title, subtitle, children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <header className="auth-header">
        <span className="auth-brand">{messages.brand}</span>
      </header>
      <section className="auth-stage">
        <div className={kicker ? 'auth-card auth-card--platform' : 'auth-card'}>
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