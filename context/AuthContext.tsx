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

const NOT_AUTHORIZED_MESSAGE =
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
 * Uses maybeSingle() so an absent email resolves to null data (not an error).
 * On any query error we fail closed (treat as not authorized).
 */
async function isWhitelisted(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", email)
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

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
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
