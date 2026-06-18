"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, NOT_AUTHORIZED_MESSAGE } from "@/context/AuthContext";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    router.push("/dashboard");
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
