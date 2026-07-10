"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { supabase } from "@/utils/supabase/client";
import { logError } from "@/utils/logging/log";

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png"];

type Props = {
  /** Called with the uploaded image's public URL on success. */
  onUploaded: (publicUrl: string) => void;
};

export function ReceiptUploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError("Please upload a .jpg, .jpeg, or .png image.");
        return;
      }

      setUploading(true);
      setError(null);
      try {
        // Random unique name to avoid overwrite collisions.
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("receipt-images")
          .upload(fileName, file);

        if (uploadError) {
          void logError({
            source: "client",
            message: `Receipt image upload failed: ${uploadError.message}`,
            context: { operation: "uploadReceiptImage" },
          });
          setError(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("receipt-images")
          .getPublicUrl(fileName);
        onUploaded(data.publicUrl);
      } catch (err) {
        void logError({
          source: "client",
          message: `Receipt image upload threw: ${(err as Error)?.message ?? String(err)}`,
          stack: (err as Error)?.stack ?? null,
          context: { operation: "uploadReceiptImage" },
        });
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    // Reset so re-selecting the same file (or re-shooting) still fires onChange.
    event.target.value = "";
  };

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-8 text-center text-sm ${
          dragging
            ? "border-foreground bg-neutral-50 dark:bg-neutral-900"
            : "border-neutral-300 dark:border-neutral-700"
        }`}
      >
        <span className="font-medium">
          {uploading
            ? "Uploading…"
            : "Drag a receipt image here, or click to browse"}
        </span>
        <span className="text-neutral-500">JPG or PNG</span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/*
        Camera capture: `capture="environment"` asks mobile browsers to open the
        rear camera directly. Desktop and unsupported browsers ignore `capture`
        and fall back to the normal file picker — same pipeline either way.
      */}
      <label
        className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-300 p-3 text-center text-sm font-medium dark:border-neutral-700 ${
          uploading ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span aria-hidden="true">📷</span>
        <span>Take a photo</span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
