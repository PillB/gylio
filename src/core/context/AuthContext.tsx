/**
 * AuthContext
 *
 * Thin wrapper that exposes the current userId and publicMetadata regardless of
 * whether ClerkProvider is present. When Clerk is disabled userId is null.
 */
import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

type PublicMetadata = Record<string, unknown>;

type AuthContextValue = {
  userId: string | null;
  userMetadata: PublicMetadata | null;
  /** Reloads the Clerk user session to pick up publicMetadata changes. Null when Clerk is disabled. */
  reloadUser: (() => Promise<void>) | null;
  /** True when the app is running with ClerkProvider present. */
  clerkEnabled: boolean;
  /** False until Clerk has decided whether someone is signed in. Always true without Clerk. */
  authLoaded: boolean;
  /**
   * Signs out, then runs `afterSignOut` instead of Clerk's own redirect. Rejects, without running it, when sign-out
   * did not happen (offline, for one). Null when Clerk is disabled.
   */
  signOut: ((afterSignOut: () => void) => Promise<void>) | null;
};

const AuthCtx = createContext<AuthContextValue>({
  userId: null,
  userMetadata: null,
  reloadUser: null,
  clerkEnabled: false,
  authLoaded: true,
  signOut: null,
});

/** Use when ClerkProvider IS present (clerkEnabled=true path). */
function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded, signOut: clerkSignOut } = useAuth();
  const { user } = useUser();
  const userMetadata = (user?.publicMetadata as PublicMetadata) ?? null;
  const reloadUser = user ? () => user.reload().then(() => undefined) : null;
  const signOut = async (afterSignOut: () => void) => {
    let ran = false;
    await clerkSignOut(() => {
      ran = true;
      afterSignOut();
    });
    // Clerk skips the callback when it holds no session at all; the person is signed out either way.
    if (!ran) afterSignOut();
  };
  return (
    <AuthCtx.Provider value={{ userId: userId ?? null, userMetadata, reloadUser, clerkEnabled: true, authLoaded: Boolean(isLoaded), signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

/** Use when ClerkProvider is NOT present (no-auth path). */
function NoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthCtx.Provider value={{ userId: null, userMetadata: null, reloadUser: null, clerkEnabled: false, authLoaded: true, signOut: null }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function AuthProvider({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) {
  if (clerkEnabled) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }
  return <NoAuthProvider>{children}</NoAuthProvider>;
}

/** Hook: returns current Clerk userId + publicMetadata (or nulls when signed out / Clerk disabled). */
export function useAppAuth(): AuthContextValue {
  return useContext(AuthCtx);
}
