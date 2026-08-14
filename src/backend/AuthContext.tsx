import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthContext } from "./auth-context-internal";
import { cloudConfigured, getSupabase } from "./supabase";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const client = await getSupabase();
      if (!client) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await client.auth.getSession();
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
      const listener = client.auth.onAuthStateChange((_event, session) => {
        if (active) setUser(session?.user ?? null);
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signInWithDiscord = useCallback(async () => {
    const client = await getSupabase();
    if (!client) throw new Error("Cloud backend is not configured");
    const redirect = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: redirect },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const client = await getSupabase();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ configured: cloudConfigured, loading, user, signInWithDiscord, signOut }),
    [loading, signInWithDiscord, signOut, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
