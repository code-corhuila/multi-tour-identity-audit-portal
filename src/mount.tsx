import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPasswordScreen } from './auth/FirstPasswordScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { RestrictedNotice } from './auth/RestrictedNotice';
import { SignInScreen } from './auth/SignInScreen';
import type { MountProps } from './contract';
import { isValidIdentifier } from './data/security';
import { messages } from './messages';
import { PLATFORM_ADMINISTRATOR, TenantsApp } from './tenants/TenantsApp';
import { AuthCard } from './ui/AuthCard';

// The access mark of the session decides the screen (RN-SEC-PT-05, -08). It fails closed: only an absent mark
// shows the normal sign-in, and an unknown value is treated as restricted.
export function AccessRoutes({ apiClient, session, identifier }: MountProps) {
  const [saved, setSaved] = useState(false);
  // A tiny view state instead of a router: the container owns the real routes (the link is only a hint).
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [created, setCreated] = useState(false);
  // Re-render after a good sign-in so the access mark of the new session is read again.
  const [, setReads] = useState(0);
  if (identifier !== undefined && !isValidIdentifier(identifier)) {
    return <AuthCard title={messages.notFound.title} subtitle={messages.notFound.subtitle}>{null}</AuthCard>;
  }
  const access = saved ? undefined : session.access;
  if (access === 'password-change') {
    return (
      <FirstPasswordScreen
        apiClient={apiClient}
        session={session}
        onSaved={() => {
          // The service cut the older sessions: sign in again (D-07).
          session.close();
          setSaved(true);
        }}
      />
    );
  }
  if (access !== undefined) return <RestrictedNotice session={session} />;
  // No company link and a signed-in Platform Administrator: the platform screens replace the sign-in.
  if (identifier === undefined && session.roles.includes(PLATFORM_ADMINISTRATOR)) {
    return <TenantsApp apiClient={apiClient} session={session} />;
  }
  if (view === 'sign-up' && identifier !== undefined) {
    return (
      <RegisterScreen
        identifier={identifier}
        apiClient={apiClient}
        onDone={() => {
          setCreated(true);
          setView('sign-in');
        }}
        onSignIn={() => setView('sign-in')}
      />
    );
  }
  return (
    <SignInScreen
      identifier={identifier}
      apiClient={apiClient}
      session={session}
      notice={saved ? messages.firstPassword.saved : created ? messages.signUp.created : undefined}
      onCreateAccount={() => {
        setCreated(false);
        setView('sign-up');
      }}
      onSignedIn={() => {
        setSaved(false);
        setCreated(false);
        setReads((n) => n + 1);
      }}
    />
  );
}

// The container calls this with its own client and session; the portal never creates either (Annex H).
export function mount(element: HTMLElement, props: MountProps): () => void {
  const root = createRoot(element);
  root.render(<AccessRoutes {...props} />);
  return () => root.unmount();
}
