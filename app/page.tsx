"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { readSafeRedirect } from "@/utils/auth/redirect";

type Mode = "login" | "register";

// Where to go after login: a safe internal `?redirect` path (e.g. an invite link
// the user was sent to), else the dashboard.
function postLoginTarget(): string {
  return readSafeRedirect() ?? "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } =
    useAuth();

  // `null` until the user chooses Login or Register — the email/password fields
  // stay hidden until then, keeping Google as the prominent default path.
  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (e.g. landed on `/?redirect=…` with a live session, or
  // returned here after authenticating) → go straight to the target.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(postLoginTarget());
    }
  }, [authLoading, user, router]);

  // Pick (or switch to) an email mode; revealing the form clears any stale error.
  const chooseMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

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
    if (!mode) return;
    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);

    // Open signup (Epic 14): a whitelist miss is no longer a rejection — any
    // auth error is just shown inline. There is no /unauthorized dead-end.
    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }
    router.push(postLoginTarget());
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-xl">
        <Image
          src="/banner.png"
          alt="PayUp — good food, good friends, no awkward math"
          width={1280}
          height={698}
          priority
          className="h-auto w-full rounded-lg shadow-sm"
        />
      </div>

      <div className="w-full max-w-sm rounded-lg border border-neutral-300 p-6 shadow-sm dark:border-neutral-700">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2.5 font-medium shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

        <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          or use email
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="flex rounded-md border border-neutral-300 p-1 text-sm dark:border-neutral-700">
          <button
            type="button"
            onClick={() => chooseMode("login")}
            aria-pressed={mode === "login"}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "login" ? "bg-foreground text-background" : ""
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => chooseMode("register")}
            aria-pressed={mode === "register"}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "register" ? "bg-foreground text-background" : ""
            }`}
          >
            Register
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {mode ? (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                className="rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
              />
            </label>

            {mode === "login" ? (
              <Link
                href="/forgot-password"
                className="-mt-2 self-end text-xs text-neutral-500 underline"
              >
                Forgot password?
              </Link>
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
        ) : null}
      </div>

      <footer className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        <p>© 2026 PayUp</p>
        <p className="mt-1">
          <a
            href="https://github.com/ageem23/PayUp"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <a
            href="https://github.com/ageem23/PayUp/blob/main/HELP.md"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Help
          </a>
        </p>
      </footer>
    </main>
  );
}
