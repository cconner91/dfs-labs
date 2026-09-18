import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { SavedParlay, TdParlayGroup, TdParlayPlayer, TdParlaySession } from "./types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getSessions(supabase: SupabaseClient, userId: string): Promise<TdParlaySession[]> {
  const { data, error } = await supabase
    .from("td_parlay_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSession(supabase: SupabaseClient, sessionId: string): Promise<TdParlaySession | null> {
  const { data, error } = await supabase
    .from("td_parlay_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlayers(supabase: SupabaseClient, sessionId: string): Promise<TdParlayPlayer[]> {
  const { data, error } = await supabase
    .from("td_parlay_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGroups(supabase: SupabaseClient, sessionId: string): Promise<TdParlayGroup[]> {
  const { data, error } = await supabase
    .from("td_parlay_groups")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Player ids a group is restricted to. Empty array means "use the full session pool". */
export async function getGroupPlayerIds(supabase: SupabaseClient, groupId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("td_parlay_group_players")
    .select("player_id")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []).map((r) => r.player_id);
}

export async function getSavedParlays(supabase: SupabaseClient, groupId: string): Promise<SavedParlay[]> {
  const { data, error } = await supabase
    .from("td_parlays")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
