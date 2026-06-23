"use client";

import { useState, type FormEvent } from "react";
import {
  changePassword,
  changeEmail,
  MIN_PASSWORD_LENGTH,
} from "@/utils/auth/account";

type Feedback = { ok: boolean; text: string } | null;

type Props = {
  currentEmail: string;
};

/**
 * Change-password and change-email controls (Story 15.5). Both act on the user's
 * own Supabase session via auth.updateUser; email change goes through Supabase's
 * confirmation-link flow. Errors are surfaced as friendly messages.
 */
export function AccountSecurity({ currentEmail }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Feedback>(null);

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Feedback>(null);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwMsg(null);
    if (password !== confirm) {
      setPwMsg({ ok: false, text: "The two passwords don't match." });
      return;
    }
    setPwBusy(true);
    const result = await changePassword(password);
    setPwBusy(false);
    if (result.ok) {
      setPwMsg({ ok: true, text: "Password updated." });
      setPassword("");
      setConfirm("");
    } else {
      setPwMsg({ ok: false, text: result.error });
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailMsg(null);
    const target = email.trim();
    setEmailBusy(true);
    const result = await changeEmail(target);
    setEmailBusy(false);
    if (result.ok) {
      setEmailMsg({
        ok: true,
        text: `Confirmation link sent to ${target}. Your email changes once you confirm it there.`,
      });
      setEmail("");
    } else {
      setEmailMsg({ ok: false, text: result.error });
    }
  };

  const inputClass =
    "rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";
  const buttonClass =
    "self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";

  return (
    <section className="mt-8 flex flex-col gap-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-lg font-medium">Security</h2>

      <form onSubmit={submitPassword} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Change password</h3>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          aria-label="New password"
          autoComplete="new-password"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Confirm new password"
          aria-label="Confirm new password"
          autoComplete="new-password"
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pwBusy || !password} className={buttonClass}>
            {pwBusy ? "Updating…" : "Update password"}
          </button>
          {pwMsg ? (
            <span
              role={pwMsg.ok ? undefined : "alert"}
              className={`text-sm ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}
            >
              {pwMsg.text}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-neutral-400">
          At least {MIN_PASSWORD_LENGTH} characters.
        </span>
      </form>

      <form onSubmit={submitEmail} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Change email</h3>
        <span className="text-xs text-neutral-400">Current: {currentEmail}</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="New email"
          aria-label="New email"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={emailBusy || !email.trim()}
            className={buttonClass}
          >
            {emailBusy ? "Sending…" : "Change email"}
          </button>
          {emailMsg ? (
            <span
              role={emailMsg.ok ? undefined : "alert"}
              className={`text-sm ${emailMsg.ok ? "text-green-600" : "text-red-600"}`}
            >
              {emailMsg.text}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
