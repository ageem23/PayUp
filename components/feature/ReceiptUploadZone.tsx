"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { supabase } from "@/utils/supabase/client";

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
          setError(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("receipt-images")
          .getPublicUrl(fileName);
        onUploaded(data.publicUrl);
      } catch {
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
          dragging ? "border-foreground bg-neutral-50" : "border-neutral-300"
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
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
