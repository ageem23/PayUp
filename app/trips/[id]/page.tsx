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
import { SettleUpLedger } from "@/components/feature/SettleUpLedger";
import { InviteLinkManager } from "@/components/feature/InviteLinkManager";
import { fetchReceiptQuota, type ReceiptQuota } from "@/utils/db/receiptQuota";
import {
  compileLedger,
  type LedgerReceipt,
} from "@/utils/math/ledgerCompiler";
import { minimizeDebts } from "@/utils/math/debtMinimizer";

type Trip = {
  id: string;
  name: string;
  participants: string[] | null;
  user_id: string | null;
};

// The trip page needs both the ledger fields (LedgerReceipt) and the list
// display fields, so it fetches a superset. compileLedger only reads the
// LedgerReceipt subset, so the extra columns are harmless to it.
type TripReceipt = LedgerReceipt & ReceiptListItem;

// Single source of truth for the receipt columns the page reads (list + ledger).
const RECEIPT_SELECT =
  "id,name,image_url,created_at,paid_by,processed_data,split_among,tax,tip";

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
            .select("id,name,participants,user_id")
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
      <Link href="/dashboard" className="text-sm text-neutral-500 underline">
        ← Dashboard
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-semibold">{trip.name}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {trip.participants && trip.participants.length > 0
          ? trip.participants.join(", ")
          : "No participants"}
      </p>

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
