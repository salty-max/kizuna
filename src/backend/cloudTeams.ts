import type { Team } from "@/domain/team";
import { decodeShareInput, encodeShareCode } from "@/lib/share";
import { getSupabase } from "./supabase";

export interface CloudTeam {
  id: string;
  name: string;
  slug: string;
  visibility: "private" | "unlisted" | "public";
  payload: string;
  savedAt: string;
}

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  visibility: CloudTeam["visibility"];
  current_payload: string;
  updated_at: string;
}

function fromRow(row: TeamRow): CloudTeam {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    visibility: row.visibility,
    payload: row.current_payload,
    savedAt: row.updated_at,
  };
}

async function authenticatedClient() {
  const client = await getSupabase();
  if (!client) throw new Error("Cloud backend is not configured");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Authentication required");
  return { client, user: data.user };
}

export async function listCloudTeams(): Promise<CloudTeam[]> {
  const { client, user } = await authenticatedClient();
  const { data, error } = await client
    .from("teams")
    .select("id,name,slug,visibility,current_payload,updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as TeamRow[]).map(fromRow);
}

/** Save by name, mirroring localStorage semantics; the database appends a version. */
export async function saveCloudTeam(team: Team): Promise<CloudTeam> {
  const { client, user } = await authenticatedClient();
  const name = team.name.trim();
  const payload = encodeShareCode(team);
  const { data: existing, error: lookupError } = await client
    .from("teams")
    .select("id,slug")
    .eq("owner_id", user.id)
    .eq("name", name)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const values = {
    owner_id: user.id,
    name,
    slug: existing?.slug ?? crypto.randomUUID().replaceAll("-", ""),
    visibility: "private" as const,
    current_payload: payload,
    format_version: 1,
  };
  const query = existing
    ? client.from("teams").update(values).eq("id", existing.id)
    : client.from("teams").insert(values);
  const { data, error } = await query
    .select("id,name,slug,visibility,current_payload,updated_at")
    .single();
  if (error) throw error;
  return fromRow(data as TeamRow);
}

export async function deleteCloudTeam(id: string): Promise<void> {
  const { client } = await authenticatedClient();
  const { error } = await client.from("teams").delete().eq("id", id);
  if (error) throw error;
}

export function restoreCloudTeam(entry: CloudTeam): Team | null {
  return decodeShareInput(entry.payload);
}
