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

export const NOT_AUTHORIZED_MESSAGE =
  "This email is not authorized to access PayUp. Contact an administrator to be added to the whitelist.";

type AuthResult = { error: string | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Returns true when the email exists in the public.allowed_users whitelist.
 * The email is normalized (trimmed + lowercased) to match Supabase Auth, which
 * stores emails lowercased — without this, "User@x.com" would authenticate but
 * fail a case-sensitive whitelist lookup and get signed out.
 * Uses maybeSingle() so an absent email resolves to null data (not an error).
 * On any query error we fail closed (treat as not authorized).
 */
async function isWhitelisted(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    return false;
  }
  return data !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
          }
          return;
        }
      }
      if (active) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
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

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut }}
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
