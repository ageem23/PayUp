import Image from "next/image";

// Shared PayUp banner (public/banner.png), reused on the login page (Story 22.1)
// and the dashboard (Story 22.3). The source art carries a decorative dark
// border frame; we trim it in CSS — an `overflow-hidden` clip plus a slight
// `scale` that pushes the frame past the clip box — so the illustration sits
// edge-to-edge. This reuses the single asset (no second, pre-cropped file).
// Width is controlled by the caller via `className` (e.g. `max-w-sm`).
export function BannerLogo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-lg shadow-xs ${className}`}>
      <Image
        src="/banner.png"
        alt="PayUp — good food, good friends, no awkward math"
        width={1280}
        height={698}
        priority={priority}
        // scale-[1.06] enlarges ~6% so the ~2–3% border frame on each edge is
        // clipped by the parent's overflow-hidden; transform doesn't change the
        // layout box, so the trimmed image keeps its width.
        className="h-auto w-full scale-[1.06]"
      />
    </div>
  );
}
