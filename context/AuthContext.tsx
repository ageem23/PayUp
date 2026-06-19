"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import { isWhitelisted } from "@/utils/auth/whitelist";

export const NOT_AUTHORIZED_MESSAGE =
  "This email is not authorized to access PayUp. Contact an administrator to be added to the whitelist.";

type AuthResult = { error: string | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Set when a session is rejected because its email isn't whitelisted (e.g. a
  // Google sign-in by an unlisted user). Lets the OAuth callback distinguish a
  // whitelist rejection (→ /unauthorized) from "never signed in" (→ /).
  authNotice: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Accept a session only if its user is still whitelisted. This guards
    // re-hydrated and refreshed sessions (e.g. a user removed from the
    // whitelist after a previous login, or a token established outside our
    // signIn wrapper) — not just fresh signIn/signUp calls. Fails closed.
    const applySession = async (nextSession: Session | null) => {
      // A session is only accepted if it carries an email that is on the
      // whitelist. A session with a missing/empty email (e.g. phone or
      // anonymous auth) is treated as unauthorized — fail closed.
      if (nextSession) {
        const email = nextSession.user?.email;
        if (!email || !(await isWhitelisted(email))) {
          await supabase.auth.signOut();
          if (active) {
            setSession(null);
            setUser(null);
            setAuthNotice(NOT_AUTHORIZED_MESSAGE);
          }
          return;
        }
      }
      if (active) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession) setAuthNotice(null);
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
      if (active) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // signOut() inside applySession re-fires this with a null session, which
      // takes the no-email path below — no infinite loop.
      void applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { error: error.message };
      }

      // Credentials are valid — now enforce the whitelist. If the email is not
      // authorized, tear the session down immediately so it never lingers.
      if (!(await isWhitelisted(email))) {
        await supabase.auth.signOut();
        return { error: NOT_AUTHORIZED_MESSAGE };
      }
      return { error: null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      // Check the whitelist BEFORE creating the account to avoid orphan auth
      // users that can never sign in.
      if (!(await isWhitelisted(email))) {
        return { error: NOT_AUTHORIZED_MESSAGE };
      }

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    // Implicit OAuth handshake: Supabase routes to Google, then back to our
    // callback route, which enforces the whitelist intersection before letting
    // the session into the app. The redirect URL must be allow-listed in the
    // Supabase Auth settings.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authNotice,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
