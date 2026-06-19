"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import {
  MatrixStateWrapper,
  type LineItem,
} from "@/components/feature/MatrixStateWrapper";
import { type SplitAllocation } from "@/components/feature/ReceiptMatrix";
import { ReceiptSplitView } from "@/components/feature/ReceiptSplitView";

type Trip = { id: string; name: string; participants: string[] | null };

type Receipt = {
  id: string;
  name: string;
  image_url: string | null;
  processed_data: LineItem[] | null;
  split_among: SplitAllocation[] | null;
  tax: number | null;
  tip: number | null;
};

export default function ReceiptMatrixPage() {
  const params = useParams<{ id: string; receiptId: string }>();
  const tripId = params.id;
  const receiptId = params.receiptId;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (userId: string) => {
      setLoadingData(true);
      setError(null);
      try {
        const [tripRes, receiptRes] = await Promise.all([
          supabase
            .from("trips")
            .select("id,name,participants")
            .eq("id", tripId)
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("receipts")
            .select("id,name,image_url,processed_data,split_among,tax,tip")
            .eq("id", receiptId)
            .eq("trip_id", tripId)
            .maybeSingle(),
        ]);

        if (
          tripRes.error ||
          !tripRes.data ||
          receiptRes.error ||
          !receiptRes.data
        ) {
          setError("Receipt not found.");
          setTrip(null);
          setReceipt(null);
        } else {
          setTrip(tripRes.data as Trip);
          setReceipt(receiptRes.data as Receipt);
        }
      } catch {
        setError("Could not load this receipt.");
      } finally {
        setLoadingData(false);
      }
    },
    [tripId, receiptId],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void loadData(user.id);
  }, [loading, user, router, loadData]);

  if (loading || !user || loadingData) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (error || !trip || !receipt) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-neutral-600">{error ?? "Receipt not found."}</p>
        <Link href={`/trips/${tripId}`} className="font-medium underline">
          Back to trip
        </Link>
      </main>
    );
  }

  const participants = trip.participants ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-6">
      <Link href={`/trips/${tripId}`} className="text-sm text-neutral-500 underline">
        ← {trip.name}
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">{receipt.name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex items-start justify-center rounded-lg border border-neutral-300 p-4">
          {receipt.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded external receipt image of unknown size; next/image would need remotePatterns config and offers no benefit for a preview
            <img
              src={receipt.image_url}
              alt={receipt.name}
              className="max-h-[70vh] w-auto rounded"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <MatrixStateWrapper
            receiptId={receipt.id}
            imageUrl={receipt.image_url}
            initialProcessedData={receipt.processed_data}
          >
            {(items) => (
              <ReceiptSplitView
                receiptId={receipt.id}
                items={items}
                participants={participants}
                initialSplitAmong={receipt.split_among}
                initialTax={receipt.tax ?? 0}
                initialTip={receipt.tip ?? 0}
              />
            )}
          </MatrixStateWrapper>
        </div>
      </div>
    </main>
  );
}
