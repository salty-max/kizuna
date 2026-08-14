import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
