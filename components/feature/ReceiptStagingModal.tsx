"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/utils/supabase/client";

type Props = {
  tripId: string;
  participants: string[];
  imageUrl: string;
  onClose: () => void;
  onCreated: (receiptId: string) => void;
};

export function ReceiptStagingModal({
  tripId,
  participants,
  imageUrl,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [paidBy, setPaidBy] = useState(participants[0] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a receipt name.");
      return;
    }
    if (!paidBy) {
      setError("Please select who paid.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("receipts")
        .insert([
          {
            trip_id: tripId,
            name: trimmed,
            amount: 0.0,
            paid_by: paidBy,
            image_url: imageUrl,
            split_among: [],
          },
        ])
        .select("id")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Could not save the receipt.");
        return;
      }
      onCreated(data.id as string);
    } catch {
      setError("Could not save the receipt. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stage receipt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Stage receipt</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Receipt name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Dinner at Luigi's"
              className="rounded border border-neutral-300 bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Paid by
            <select
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              required
              className="rounded border border-neutral-300 bg-transparent px-3 py-2"
            >
              {participants.length === 0 ? (
                <option value="">No participants on this trip</option>
              ) : null}
              {participants.map((participant) => (
                <option key={participant} value={participant}>
                  {participant}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
