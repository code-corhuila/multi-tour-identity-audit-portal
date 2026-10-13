import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPasswordScreen } from './auth/FirstPasswordScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { RestrictedNotice } from './auth/RestrictedNotice';
import { SignInScreen } from './auth/SignInScreen';
import type { MountProps } from './contract';
import { isValidIdentifier } from './data/security';
import { messages } from './messages';
import { CustomerHome } from './shell/CustomerHome';
import { FINAL_CUSTOMER, isStaff, PLATFORM_ADMINISTRATOR } from './shell/roles';
import { StaffHome } from './shell/StaffHome';
import { PlatformShell } from './shell/PlatformShell';
import { AuthCard } from './ui/AuthCard';
import { NavigateContext } from './ui/navigation';
import { ensureStylesheet } from './ui/stylesheet';

// The access mark of the session decides the screen (RN-SEC-PT-05, -08). It fails closed: only an absent mark
// shows the normal sign-in, and an unknown value is treated as restricted.
export function AccessRoutes({ apiClient, session, identifier: link, scope, navigate, commercialName, visualIdentity, onVisualIdentityChange }: MountProps) {
  const [saved, setSaved] = useState(false);
  // Company typed in the general sign-in or sign-up; with a company link, the link wins.
  const [typedCompany, setTypedCompany] = useState<string | undefined>();
  const general = scope === 'general';
  const identifier = general ? undefined : link;
  const company = general ? typedCompany : link;
  // A tiny view state instead of a router: the container owns the real routes (the link is only a hint).
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [created, setCreated] = useState(false);
  // Re-render after a good sign-in so the access mark of the new session is read again.
  const [, setReads] = useState(0);
  // Every sign-out closes the session and re-reads it, so the sign-in shows again (the container's session drops the
  // roles and the access mark when it closes).
  const signOut = () => {
    session.close();
    setReads((n) => n + 1);
  };
  if (identifier !== undefined && !isValidIdentifier(identifier)) {
    return <AuthCard title={messages.notFound.title} subtitle={messages.notFound.subtitle}>{null}</AuthCard>;
  }
  const access = saved ? undefined : session.access;
  if (access === 'password-change') {
    return (
      <FirstPasswordScreen
        apiClient={apiClient}
        session={session}
        onSignOut={signOut}
        onSaved={() => {
          // The service cut the older sessions: sign in again (D-07).
          session.close();
          setSaved(true);
        }}
      />
    );
  }
  if (access !== undefined) return <RestrictedNotice session={session} onSignOut={signOut} />;
  // No company link and a signed-in Platform Administrator: the platform shell replaces the sign-in.
  if (!general && identifier === undefined && session.roles.includes(PLATFORM_ADMINISTRATOR)) {
    return <PlatformShell apiClient={apiClient} session={session} onSignOut={signOut} />;
  }
  // A signed-in person of a company goes to their own screen (in the general scope, the company they typed).
  if (company !== undefined) {
    if (isStaff(session.roles)) {
      return (
        <StaffHome
          identifier={company}
          session={session}
          apiClient={apiClient}
          commercialName={commercialName}
          visualIdentity={visualIdentity}
          onVisualIdentityChange={onVisualIdentityChange}
          onSignOut={signOut}
        />
      );
    }
    if (session.roles.includes(FINAL_CUSTOMER)) return <CustomerHome identifier={company} onSignOut={signOut} />;
  }
  if (view === 'sign-up' && (identifier !== undefined || general)) {
    return (
      <RegisterScreen
        identifier={general ? typedCompany : identifier}
        askCompany={general}
        apiClient={apiClient}
        onDone={(done) => {
          if (general) setTypedCompany(done);
          setCreated(true);
          setView('sign-in');
        }}
        onSignIn={(typed) => {
          if (general && typed) setTypedCompany(typed);
          setView('sign-in');
        }}
      />
    );
  }
  return (
    <SignInScreen
      identifier={identifier}
      scope={scope}
      initialCompany={general ? typedCompany : undefined}
      apiClient={apiClient}
      session={session}
      notice={saved ? messages.firstPassword.saved : created ? messages.signUp.created : undefined}
      onCreateAccount={(typed) => {
        if (general && typed) setTypedCompany(typed);
        setCreated(false);
        setView('sign-up');
      }}
      onSignedIn={(signedCompany) => {
        setSaved(false);
        setCreated(false);
        if (general) {
          setTypedCompany(signedCompany);
          // The portal is mounted at the company's sign-in route (the index of /t/<id> is its public landing); with an
          // open session the tenant scope shows the panel of the role. The container keeps the session across this.
          if (signedCompany) navigate?.(`/t/${signedCompany}/ingresar`);
        }
        setReads((n) => n + 1);
      }}
    />
  );
}

// The container calls this with its own client and session; the portal never creates either (Annex H).
export function mount(element: HTMLElement, props: MountProps): () => void {
  ensureStylesheet();
  const root = createRoot(element);
  root.render(
    <NavigateContext.Provider value={props.navigate}>
      <AccessRoutes {...props} />
    </NavigateContext.Provider>,
  );
  return () => root.unmount();
}
