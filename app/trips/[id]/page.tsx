"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { ReceiptUploadZone } from "@/components/feature/ReceiptUploadZone";
import { ReceiptStagingModal } from "@/components/feature/ReceiptStagingModal";
import { ReceiptList, type ReceiptListItem } from "@/components/feature/ReceiptList";
import { ReceiptQuotaGate } from "@/components/feature/ReceiptQuotaGate";
import { AccessRequestModal } from "@/components/feature/AccessRequestModal";
import { AccountMenu } from "@/components/feature/AccountMenu";
import { SettleUpLedger } from "@/components/feature/SettleUpLedger";
import { InviteLinkManager } from "@/components/feature/InviteLinkManager";
import { fetchReceiptQuota, type ReceiptQuota } from "@/utils/db/receiptQuota";
import {
  compileLedger,
  type LedgerReceipt,
} from "@/utils/math/ledgerCompiler";
import { minimizeDebts } from "@/utils/math/debtMinimizer";
import {
  parseParticipantInput,
  addParticipants,
  receiptsReferencingParticipant,
} from "@/utils/participants";
import { setTripParticipants } from "@/utils/db/tripParticipants";

type Trip = {
  id: string;
  name: string;
  participants: string[] | null;
  user_id: string | null;
  is_settled: boolean | null;
};

// The trip page needs both the ledger fields (LedgerReceipt) and the list
// display fields, so it fetches a superset. compileLedger only reads the
// LedgerReceipt subset, so the extra columns are harmless to it.
type TripReceipt = LedgerReceipt & ReceiptListItem;

// Single source of truth for the receipt columns the page reads (list + ledger).
const RECEIPT_SELECT =
  "id,name,image_url,created_at,paid_by,processed_data,split_among,tax,tip,split_mode,even_split_among,amount";

export default function TripHubPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [receipts, setReceipts] = useState<TripReceipt[]>([]);
  const [receiptsError, setReceiptsError] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stagingUrl, setStagingUrl] = useState<string | null>(null);
  // Free-tier receipt quota (Story 14.4). Display-only; the DB trigger enforces.
  const [quota, setQuota] = useState<ReceiptQuota | null>(null);
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);

  const refreshQuota = useCallback(async () => {
    setQuota(await fetchReceiptQuota());
  }, []);

  const loadTrip = useCallback(
    async () => {
      setLoadingTrip(true);
      setError(null);
      try {
        // Fetch the trip and its receipts together; the receipts feed the
        // cross-receipt Settle Up ledger (Epic 8). RLS scopes both to the user.
        const [tripRes, receiptsRes] = await Promise.all([
          // No owner filter: RLS returns the trip if the user owns it OR is a
          // member (Feature 11.3), so invited members can open it too.
          supabase
            .from("trips")
            .select("id,name,participants,user_id,is_settled")
            .eq("id", tripId)
            .maybeSingle(),
          supabase
            .from("receipts")
            .select(RECEIPT_SELECT)
            .eq("trip_id", tripId)
            .order("created_at", { ascending: false }),
        ]);

        if (tripRes.error || !tripRes.data) {
          setError("Trip not found.");
          setTrip(null);
          setReceipts([]);
          setReceiptsError(false);
        } else {
          setTrip(tripRes.data as Trip);
          // Supabase resolves (not throws) on a query error, so check it
          // explicitly — otherwise a failed receipts load would look like an
          // empty (fully settled) trip.
          if (receiptsRes.error || !Array.isArray(receiptsRes.data)) {
            setReceipts([]);
            setReceiptsError(true);
          } else {
            setReceipts(receiptsRes.data as TripReceipt[]);
            setReceiptsError(false);
          }
        }
      } catch {
        setError("Could not load this trip.");
        setTrip(null);
        setReceipts([]);
        setReceiptsError(false);
      } finally {
        setLoadingTrip(false);
      }
    },
    [tripId],
  );

  // Lightweight re-fetch of just the receipts (no full-page loading flag), used
  // after a delete and by the realtime subscription so the list/ledger update
  // without flashing the whole page.
  const refreshReceipts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select(RECEIPT_SELECT)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error || !Array.isArray(data)) {
        // Surface the failure rather than leaving stale/empty receipts that
        // would misleadingly render as "No receipts yet".
        setReceiptsError(true);
        return;
      }
      setReceipts(data as TripReceipt[]);
      setReceiptsError(false);
    } catch {
      setReceiptsError(true);
    }
  }, [tripId]);

  // Realtime (Epic 12): when any receipt on this trip is added, changed, or
  // deleted by another client, refresh the list + ledger so it disappears /
  // appears for everyone. `replica identity full` (0008) makes the DELETE event
  // carry the old row, so the trip_id filter matches deletes too.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`trip-receipts:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void refreshReceipts();
          // A new/removed receipt changes this user's rolling-window count.
          void refreshQuota();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, user, refreshReceipts, refreshQuota]);

  const isOwner = !!user && !!trip && trip.user_id === user.id;

  // Owner-only completion toggle (Story 17.2), reusing trips.is_settled. The
  // owner-only trips UPDATE RLS is the authority; the control is hidden for
  // members.
  const [savingCompleted, setSavingCompleted] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const toggleCompleted = useCallback(async () => {
    if (!trip) return;
    const next = !trip.is_settled;
    setSavingCompleted(true);
    setCompletionError(null);
    try {
      const { error: updateError } = await supabase
        .from("trips")
        .update({ is_settled: next })
        .eq("id", trip.id)
        .select("id");
      if (!updateError) {
        setTrip((prev) => (prev ? { ...prev, is_settled: next } : prev));
      } else {
        setCompletionError("Couldn't update trip status. Please try again.");
      }
    } finally {
      setSavingCompleted(false);
    }
  }, [trip]);

  // In-trip participant management (Story 17.4). Owner + members may edit via the
  // set_trip_participants RPC; removal is blocked while a name is referenced.
  const [participantInput, setParticipantInput] = useState("");
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);

  const persistParticipants = useCallback(
    async (next: string[]) => {
      if (!trip) return;
      setSavingParticipants(true);
      setParticipantError(null);
      const result = await setTripParticipants(trip.id, next);
      setSavingParticipants(false);
      if (result.ok) {
        setTrip((prev) => (prev ? { ...prev, participants: next } : prev));
      } else {
        setParticipantError("Couldn't update participants. Please try again.");
      }
    },
    [trip],
  );

  const addTripParticipants = useCallback(() => {
    const names = parseParticipantInput(participantInput);
    if (names.length === 0) return;
    const next = addParticipants(trip?.participants ?? [], names);
    setParticipantInput("");
    void persistParticipants(next);
  }, [participantInput, trip?.participants, persistParticipants]);

  const removeTripParticipant = useCallback(
    (name: string) => {
      const usedIn = receiptsReferencingParticipant(name, receipts);
      if (usedIn.length > 0) {
        setParticipantError(
          `Can't remove ${name} — used in ${usedIn.join(", ")}. Reassign those first.`,
        );
        return;
      }
      const next = (trip?.participants ?? []).filter((p) => p !== name);
      void persistParticipants(next);
    },
    [receipts, trip?.participants, persistParticipants],
  );

  // Recompute the minimal settle-up transfers whenever the trip's receipts or
  // participant list change. `balanced` is false if the ledger doesn't reconcile
  // to zero — in that case we don't render (misleading) transfers.
  const { transfers, balanced } = useMemo(() => {
    if (!trip) return { transfers: [], balanced: true };
    const { net, balanced } = compileLedger(receipts, trip.participants ?? []);
    return { transfers: minimizeDebts(net), balanced };
  }, [receipts, trip]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void loadTrip();
    void refreshQuota();
  }, [loading, user, router, loadTrip, refreshQuota]);

  if (loading || !user || loadingTrip) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-neutral-600">{error ?? "Trip not found."}</p>
        <Link href="/dashboard" className="font-medium underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-neutral-500 underline">
          ← Dashboard
        </Link>
        <AccountMenu />
      </div>
      <div className="mb-2 mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        {trip.is_settled ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Completed
          </span>
        ) : null}
        {isOwner ? (
          <button
            type="button"
            onClick={() => void toggleCompleted()}
            disabled={savingCompleted}
            className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            {savingCompleted
              ? "Saving…"
              : trip.is_settled
                ? "Mark active"
                : "Mark completed"}
          </button>
        ) : null}
      </div>
      {completionError ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {completionError}
        </p>
      ) : null}
      <section className="mb-6 flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Participants</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(trip.participants ?? []).map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 rounded-full border border-neutral-300 py-0.5 pl-3 pr-1 text-sm dark:border-neutral-700"
            >
              {name}
              <button
                type="button"
                onClick={() => removeTripParticipant(name)}
                disabled={savingParticipants}
                aria-label={`Remove ${name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-xs leading-none disabled:opacity-50 dark:bg-neutral-700"
              >
                ×
              </button>
            </span>
          ))}
          {(trip.participants ?? []).length === 0 ? (
            <span className="text-sm text-neutral-400">No participants yet.</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <label htmlFor="trip-participant-input" className="sr-only">
            Add participants
          </label>
          <input
            id="trip-participant-input"
            type="text"
            value={participantInput}
            onChange={(event) => setParticipantInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTripParticipants();
              }
            }}
            placeholder="Add names (space-separated)"
            disabled={savingParticipants}
            className="flex-1 rounded border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
          />
          <button
            type="button"
            onClick={addTripParticipants}
            disabled={savingParticipants}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            Add
          </button>
        </div>
        {participantError ? (
          <p role="alert" className="text-sm text-red-600">
            {participantError}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a receipt</h2>
        <ReceiptQuotaGate
          quota={quota}
          onRequestAccess={() => setRequestAccessOpen(true)}
        >
          <ReceiptUploadZone onUploaded={(url) => setStagingUrl(url)} />
        </ReceiptQuotaGate>
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Receipts</h2>
        {receiptsError ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            Could not load receipts. Try refreshing the page.
          </p>
        ) : (
          <ReceiptList
            tripId={trip.id}
            receipts={receipts}
            onDeleted={() => void refreshReceipts()}
          />
        )}
      </section>

      {isOwner ? (
        <div className="mt-6">
          <InviteLinkManager tripId={trip.id} />
        </div>
      ) : null}

      <SettleUpLedger transfers={transfers} error={receiptsError || !balanced} />

      {stagingUrl ? (
        <ReceiptStagingModal
          tripId={trip.id}
          participants={trip.participants ?? []}
          imageUrl={stagingUrl}
          onClose={() => {
            setStagingUrl(null);
            // The insert may have been blocked by the quota trigger; resync the
            // counter so the gate reflects the server's authoritative state.
            void refreshQuota();
          }}
          onCreated={(receiptId) => {
            setStagingUrl(null);
            router.push(`/trips/${trip.id}/receipts/${receiptId}`);
          }}
        />
      ) : null}

      {requestAccessOpen ? (
        <AccessRequestModal onClose={() => setRequestAccessOpen(false)} />
      ) : null}
    </main>
  );
}
