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
};

const AuthCtx = createContext<AuthContextValue>({ userId: null, userMetadata: null });

/** Use when ClerkProvider IS present (clerkEnabled=true path). */
function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const userMetadata = (user?.publicMetadata as PublicMetadata) ?? null;
  return (
    <AuthCtx.Provider value={{ userId: userId ?? null, userMetadata }}>
      {children}
    </AuthCtx.Provider>
  );
}

/** Use when ClerkProvider is NOT present (no-auth path). */
function NoAuthProvider({ children }: { children: ReactNode }) {
  return <AuthCtx.Provider value={{ userId: null, userMetadata: null }}>{children}</AuthCtx.Provider>;
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
