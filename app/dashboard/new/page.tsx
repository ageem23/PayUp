"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";

export default function NewTripPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [tripName, setTripName] = useState("");
  const [participantInput, setParticipantInput] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // /dashboard/* is an authenticated area — bounce unauthenticated visitors home.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const addParticipant = () => {
    const name = participantInput.trim();
    if (!name) return;
    setParticipants((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setParticipantInput("");
  };

  const removeParticipant = (name: string) => {
    setParticipants((prev) => prev.filter((participant) => participant !== name));
  };

  const handleParticipantKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds a participant rather than submitting the whole form.
    if (event.key === "Enter") {
      event.preventDefault();
      addParticipant();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const name = tripName.trim();
    if (!name) {
      setError("Please enter a trip name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("trips")
        .insert([{ name, participants, user_id: user.id }])
        .select()
        .single();

      if (insertError || !data) {
        setError(
          insertError?.message ?? "Could not create the trip. Please try again.",
        );
        return;
      }
      router.push(`/trips/${data.id}`);
    } catch {
      setError("Could not create the trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 mt-8 text-2xl font-semibold">New trip</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1 text-sm">
            Trip name
            <input
              type="text"
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              required
              placeholder="Weekend in Tahoe"
              className="rounded border border-neutral-300 bg-transparent px-3 py-2"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm">Participants</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={participantInput}
                onChange={(event) => setParticipantInput(event.target.value)}
                onKeyDown={handleParticipantKeyDown}
                autoCapitalize="words"
                placeholder="Add a name, press Enter"
                className="flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
              >
                Add
              </button>
            </div>

            {participants.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {participants.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-full border border-neutral-300 py-1 pl-3 pr-2 text-sm"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeParticipant(name)}
                      aria-label={`Remove ${name}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs leading-none"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No participants yet.</p>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create trip"}
          </button>
        </form>
      </div>
    </main>
  );
}
