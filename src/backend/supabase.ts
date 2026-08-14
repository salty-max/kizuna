import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const cloudConfigured = Boolean(supabaseUrl && supabaseKey);

let clientPromise: Promise<SupabaseClient> | null = null;

/** Load the SDK only for deployments that actually enable cloud accounts. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!cloudConfigured || !supabaseUrl || !supabaseKey) return null;
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }
  return clientPromise;
}
