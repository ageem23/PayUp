"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, NOT_AUTHORIZED_MESSAGE } from "@/context/AuthContext";

type Mode = "login" | "register";

// Where to go after login: an internal `?redirect` path (e.g. an invite link
// the user was sent to), else the dashboard. Only same-origin absolute paths are
// allowed — rejects `//host` and absolute URLs to prevent open redirects.
function postLoginTarget(): string {
  if (typeof window === "undefined") return "/dashboard";
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    // On success the browser is redirected to Google, so we keep loading=true
    // and never reach the line after. Only an immediate failure returns here.
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) {
      setError(oauthError);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);

    // Whitelist rejection → dedicated screen; other errors → inline message.
    if (authError === NOT_AUTHORIZED_MESSAGE) {
      router.push("/unauthorized");
      return; // keep loading=true while we navigate away
    }
    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }
    router.push(postLoginTarget());
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">PayUp</h1>

        <div className="mb-6 flex rounded-md border border-neutral-300 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            aria-pressed={mode === "login"}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "login" ? "bg-foreground text-background" : ""
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            aria-pressed={mode === "register"}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "register" ? "bg-foreground text-background" : ""
            }`}
          >
            Register
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded border border-neutral-300 px-4 py-2 font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          or
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              className="rounded border border-neutral-300 bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="rounded border border-neutral-300 bg-transparent px-3 py-2"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
