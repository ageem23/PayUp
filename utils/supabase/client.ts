import { createClient } from "@supabase/supabase-js";

// Read connection settings from the environment. NEXT_PUBLIC_* vars are inlined
// by Next.js and safe to expose to the browser; the anon key relies on Row Level
// Security for tenant isolation. Real values live in the gitignored .env.local.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly on misconfiguration rather than constructing a silently broken
// client. After this guard, TypeScript narrows both values to `string`.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing explicit Supabase credentials in local environment configuration.",
  );
}

// Single shared client-side Supabase reference for the whole app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
