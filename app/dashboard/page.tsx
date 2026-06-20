"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { ProfileSelector } from "@/components/feature/ProfileSelector";

type Trip = {
  id: string;
  name: string;
  created_at: string | null;
  is_settled: boolean | null;
};

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError(null);
    try {
      // No owner filter: RLS returns trips the user owns OR is a member of
      // (Feature 11.3), so shared trips appear here too.
      const { data, error: fetchError } = await supabase
        .from("trips")
        .select("id,name,created_at,is_settled")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Could not load your trips. Please try again.");
        setTrips([]);
      } else {
        setTrips((data ?? []) as Trip[]);
      }
    } catch {
      setError("Could not load your trips. Please try again.");
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void loadTrips();
  }, [loading, user, router, loadTrips]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <Link
          href="/dashboard/new"
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          + Create New Trip
        </Link>
      </div>

      <div className="mb-6">
        <ProfileSelector />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : loadingTrips ? (
        <p className="text-sm text-neutral-600">Loading your trips…</p>
      ) : trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="mb-3 text-neutral-600">
            You don&apos;t have any trips yet.
          </p>
          <Link href="/dashboard/new" className="font-medium underline">
            Create your first trip
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-neutral-300 p-4 transition-colors hover:border-neutral-400"
              >
                <span className="text-lg font-medium">{trip.name}</span>
                <span className="text-sm text-neutral-500">
                  {formatDate(trip.created_at)}
                </span>
                <span
                  className={`mt-auto inline-block w-fit rounded-full px-2 py-0.5 text-xs ${
                    trip.is_settled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {trip.is_settled ? "Settled" : "Active"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
