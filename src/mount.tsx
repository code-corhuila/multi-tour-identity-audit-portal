import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPasswordScreen } from './auth/FirstPasswordScreen';
import { RestrictedNotice } from './auth/RestrictedNotice';
import { SignInScreen } from './auth/SignInScreen';
import type { MountProps } from './contract';
import { messages } from './messages';

// The access mark of the session decides the screen (RN-SEC-PT-05, -08); nothing else opens with that credential.
export function AccessRoutes({ apiClient, session, identifier }: MountProps) {
  const [saved, setSaved] = useState(false);
  if (!saved && session.access === 'restricted') return <RestrictedNotice session={session} />;
  if (!saved && session.access === 'password-change') {
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
  return (
    <SignInScreen
      identifier={identifier}
      apiClient={apiClient}
      session={session}
      notice={saved ? messages.firstPassword.saved : undefined}
    />
  );
}

// The container calls this with its own client and session; the portal never creates either (Annex H).
export function mount(element: HTMLElement, props: MountProps): () => void {
  const root = createRoot(element);
  root.render(<AccessRoutes {...props} />);
  return () => root.unmount();
}
