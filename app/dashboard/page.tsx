"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { AccountMenu } from "@/components/feature/AccountMenu";
import { BannerLogo } from "@/components/ui/BannerLogo";
import { fetchProfilesByIds, type PublicProfile } from "@/utils/db/profile";
import { logError } from "@/utils/logging/log";

type Trip = {
  id: string;
  name: string;
  created_at: string | null;
  is_settled: boolean | null;
  user_id: string | null;
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
  const [owners, setOwners] = useState<Map<string, PublicProfile>>(new Map());
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Completed trips (is_settled) are hidden by default (Story 17.2).
  const [showCompleted, setShowCompleted] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError(null);
    try {
      // No owner filter: RLS returns trips the user owns OR is a member of
      // (Feature 11.3), so shared trips appear here too.
      const { data, error: fetchError } = await supabase
        .from("trips")
        .select("id,name,created_at,is_settled,user_id")
        .order("created_at", { ascending: false });

      if (fetchError) {
        void logError({
          source: "client",
          message: `Dashboard trip load failed: ${fetchError.message}`,
          path: "/dashboard",
          context: { operation: "loadTrips" },
        });
        setError("Could not load your trips. Please try again.");
        setTrips([]);
        setOwners(new Map());
      } else {
        const tripList = (data ?? []) as Trip[];
        setTrips(tripList);
        // Resolve the creators of trips shared by others (Story 17.1). The
        // co-member RLS (0015) only returns profiles the user may read.
        const sharedOwnerIds = tripList
          .map((trip) => trip.user_id)
          .filter((id): id is string => !!id && id !== user?.id);
        setOwners(
          sharedOwnerIds.length > 0
            ? await fetchProfilesByIds(sharedOwnerIds)
            : new Map(),
        );
      }
    } catch (err) {
      void logError({
        source: "client",
        message: `Dashboard trip load threw: ${(err as Error)?.message ?? String(err)}`,
        stack: (err as Error)?.stack ?? null,
        path: "/dashboard",
        context: { operation: "loadTrips" },
      });
      setError("Could not load your trips. Please try again.");
      setTrips([]);
      setOwners(new Map());
    } finally {
      setLoadingTrips(false);
    }
  }, [user?.id]);

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

  // Completed (is_settled) trips are hidden unless "Show completed" is on.
  const visibleTrips = showCompleted
    ? trips
    : trips.filter((trip) => !trip.is_settled);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex justify-end">
        <AccountMenu />
      </div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-neutral-500">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            Show completed
          </label>
          <Link
            href="/dashboard/new"
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            + Create New Trip
          </Link>
        </div>
      </div>

      {/* Full-width PayUp banner beneath the trips heading (Story 22.3). Reuses
          the shared, CSS-trimmed BannerLogo (Story 22.1). */}
      <BannerLogo className="mb-6 w-full" />

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
      ) : visibleTrips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-neutral-600">
            No active trips. Tick &ldquo;Show completed&rdquo; to see finished
            ones.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {visibleTrips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-neutral-300 p-4 transition-colors hover:border-neutral-400"
              >
                <span className="text-lg font-medium">{trip.name}</span>
                <span className="text-sm text-neutral-500">
                  {formatDate(trip.created_at)}
                </span>
                <span className="text-xs text-neutral-400">
                  {trip.user_id === user.id
                    ? "Owned by you"
                    : `Shared by ${
                        owners.get(trip.user_id ?? "")?.displayName?.trim() ||
                        "a member"
                      }`}
                </span>
                <span
                  className={`mt-auto inline-block w-fit rounded-full px-2 py-0.5 text-xs ${
                    trip.is_settled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {trip.is_settled ? "Completed" : "Active"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
