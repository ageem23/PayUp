"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { ReceiptUploadZone } from "@/components/feature/ReceiptUploadZone";
import { ReceiptStagingModal } from "@/components/feature/ReceiptStagingModal";

type Trip = {
  id: string;
  name: string;
  participants: string[] | null;
};

export default function TripHubPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stagingUrl, setStagingUrl] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  const loadTrip = useCallback(
    async (userId: string) => {
      setLoadingTrip(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("trips")
          .select("id,name,participants")
          .eq("id", tripId)
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError || !data) {
          setError("Trip not found.");
          setTrip(null);
        } else {
          setTrip(data as Trip);
        }
      } catch {
        setError("Could not load this trip.");
        setTrip(null);
      } finally {
        setLoadingTrip(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void loadTrip(user.id);
  }, [loading, user, router, loadTrip]);

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
        <ReceiptUploadZone onUploaded={(url) => setStagingUrl(url)} />
        {addedCount > 0 ? (
          <p className="text-sm text-green-700">
            Receipt added ✓ ({addedCount} this session)
          </p>
        ) : null}
      </section>

      {stagingUrl ? (
        <ReceiptStagingModal
          tripId={trip.id}
          participants={trip.participants ?? []}
          imageUrl={stagingUrl}
          onClose={() => setStagingUrl(null)}
          onCreated={() => {
            setStagingUrl(null);
            setAddedCount((count) => count + 1);
          }}
        />
      ) : null}
    </main>
  );
}
