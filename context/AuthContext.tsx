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
import { readSafeRedirect } from "@/utils/auth/redirect";

type AuthResult = { error: string | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

  useEffect(() => {
    let active = true;

    // Epic 14: the whitelist is no longer an authentication gate — anyone who
    // authenticates holds a valid session. Tier (unlimited vs. free) is resolved
    // and enforced server-side (is_unlimited_user() + the receipt-quota trigger),
    // never by signing the user out here. So we simply accept any session.
    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      // Settle loading even if getSession() rejects, or auth stays stuck loading.
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
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
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      // Open signup (Epic 14): no whitelist pre-check. Any email may register;
      // unlisted users land on the free tier and are metered server-side.
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    // Implicit OAuth handshake: Supabase routes to Google, then back to our
    // callback route. No whitelist intersection — any Google account may sign
    // in. Carry a safe `?redirect` (e.g. an invite link) through to the callback
    // so OAuth users land where they intended. The redirect URL must be
    // allow-listed in the Supabase Auth settings.
    const redirect = readSafeRedirect();
    const callbackUrl = `${window.location.origin}/auth/callback${
      redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
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
