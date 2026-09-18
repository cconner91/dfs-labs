"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/parlays/data";
import { NFL_DATA_CACHE_TAG } from "@/lib/parlays/cache-tags";
import type { GeneratedParlay, WeeklyPlayerRow } from "@/lib/parlays/types";

export interface ActionState {
  error: string | null;
}

const sessionSchema = z.object({
  label: z.string().min(1, "Give this session a name"),
  total_bankroll: z.coerce.number().positive("Total bankroll must be greater than 0"),
});

export async function createSession(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = sessionSchema.safeParse({
    label: formData.get("label"),
    total_bankroll: formData.get("total_bankroll"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("td_parlay_sessions")
    .insert({
      user_id: user.id,
      label: parsed.data.label,
      total_bankroll: parsed.data.total_bankroll,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  redirect(`/parlays/${data.id}`);
}

export async function deleteSession(sessionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("td_parlay_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) throw error;
  redirect("/parlays");
}

const playerSchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().min(1, "Player name is required"),
  team: z.string().optional(),
  american_odds: z.coerce.number().int().refine((n) => n !== 0, "Odds can't be 0"),
});

export async function addPlayer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = playerSchema.safeParse({
    session_id: formData.get("session_id"),
    name: formData.get("name"),
    team: formData.get("team") || undefined,
    american_odds: formData.get("american_odds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlay_players").insert({
    session_id: parsed.data.session_id,
    name: parsed.data.name,
    team: parsed.data.team ?? null,
    american_odds: parsed.data.american_odds,
  });
  if (error) return { error: error.message };

  revalidatePath(`/parlays/${parsed.data.session_id}`);
  return { error: null };
}

export async function deletePlayer(playerId: string, sessionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlay_players").delete().eq("id", playerId);
  if (error) throw error;
  revalidatePath(`/parlays/${sessionId}`);
}

/** Adds a player selected from the ESPN-sourced browser — context pre-filled, odds left unset. */
export async function addPlayerFromRoster(
  sessionId: string,
  player: WeeklyPlayerRow
): Promise<{ error: string | null }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlay_players").insert({
    session_id: sessionId,
    name: player.name,
    team: player.team,
    position: player.position,
    opponent: player.opponent,
    is_home: player.is_home,
    game_time: player.game_time,
    over_under: player.over_under,
    american_odds: player.american_odds,
  });
  if (error) return { error: error.message };

  revalidatePath(`/parlays/${sessionId}`);
  return { error: null };
}

/** Forces an immediate re-fetch of matchups/odds — the manual "Refresh odds" button. */
export async function refreshOdds(sessionId: string) {
  await requireUser();
  updateTag(NFL_DATA_CACHE_TAG);
  revalidatePath(`/parlays/${sessionId}`);
}

const oddsSchema = z.coerce.number().int().refine((n) => n !== 0, "Odds can't be 0");

export async function updatePlayerOdds(
  playerId: string,
  sessionId: string,
  odds: number
): Promise<{ error: string | null }> {
  const parsed = oddsSchema.safeParse(odds);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid odds" };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("td_parlay_players")
    .update({ american_odds: parsed.data })
    .eq("id", playerId);
  if (error) return { error: error.message };

  revalidatePath(`/parlays/${sessionId}`);
  return { error: null };
}

const groupSchema = z.object({
  session_id: z.string().uuid(),
  label: z.string().min(1, "Give this group a name"),
  bankroll: z.coerce.number().positive("Bankroll must be greater than 0"),
  num_parlays: z.coerce.number().int().positive().max(50),
  // Omitted/empty means "Multi" (diversified leg-counts) — stored as null.
  legs_per_parlay: z.coerce.number().int().min(2).max(10).optional(),
  risk_level: z.enum(["conservative", "balanced", "aggressive"]),
  max_exposure_pct: z.coerce.number().positive().max(100).optional(),
});

export async function createGroup(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const rawLegs = formData.get("legs_per_parlay");
  const parsed = groupSchema.safeParse({
    session_id: formData.get("session_id"),
    label: formData.get("label"),
    bankroll: formData.get("bankroll"),
    num_parlays: formData.get("num_parlays"),
    legs_per_parlay: rawLegs === "multi" || !rawLegs ? undefined : rawLegs,
    risk_level: formData.get("risk_level"),
    max_exposure_pct: formData.get("max_exposure_pct") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase } = await requireUser();

  // Enforce the session's total bankroll as a shared cap across all its groups — no
  // auto-rebalancing of existing groups, just refuse a new one that would overdraw it.
  const { data: session, error: sessionError } = await supabase
    .from("td_parlay_sessions")
    .select("total_bankroll")
    .eq("id", parsed.data.session_id)
    .single();
  if (sessionError) return { error: sessionError.message };

  if (session.total_bankroll !== null) {
    const { data: existingGroups, error: groupsError } = await supabase
      .from("td_parlay_groups")
      .select("bankroll")
      .eq("session_id", parsed.data.session_id);
    if (groupsError) return { error: groupsError.message };

    const allocated = (existingGroups ?? []).reduce((sum, g) => sum + g.bankroll, 0);
    const remaining = session.total_bankroll - allocated;
    if (parsed.data.bankroll > remaining) {
      return {
        error: `Only $${remaining.toFixed(2)} left unallocated out of the $${session.total_bankroll.toFixed(2)} total bankroll.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("td_parlay_groups")
    .insert({
      session_id: parsed.data.session_id,
      label: parsed.data.label,
      bankroll: parsed.data.bankroll,
      num_parlays: parsed.data.num_parlays,
      legs_per_parlay: parsed.data.legs_per_parlay ?? null,
      risk_level: parsed.data.risk_level,
      max_exposure_pct: parsed.data.max_exposure_pct ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const playerIds = formData.getAll("player_ids").map(String).filter(Boolean);
  if (playerIds.length > 0) {
    const { error: linkError } = await supabase
      .from("td_parlay_group_players")
      .insert(playerIds.map((playerId) => ({ group_id: data.id, player_id: playerId })));
    if (linkError) return { error: linkError.message };
  }

  revalidatePath(`/parlays/${parsed.data.session_id}`);
  return { error: null };
}

export async function deleteGroup(groupId: string, sessionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlay_groups").delete().eq("id", groupId);
  if (error) throw error;
  revalidatePath(`/parlays/${sessionId}`);
}

/** Persists one chosen client-side generation. Called directly (not via a <form>), so it takes plain args. */
export async function saveGeneratedParlays(
  groupId: string,
  sessionId: string,
  parlays: GeneratedParlay[]
): Promise<{ error: string | null }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlays").insert(
    parlays.map((p) => ({
      group_id: groupId,
      legs: p.legs,
      combined_probability: p.combinedProbability,
      payout_multiplier: p.payoutMultiplier,
      stake: p.stake,
    }))
  );
  if (error) return { error: error.message };

  revalidatePath(`/parlays/${sessionId}`);
  return { error: null };
}

export async function deleteSavedParlaySet(parlayIds: string[], sessionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("td_parlays").delete().in("id", parlayIds);
  if (error) throw error;
  revalidatePath(`/parlays/${sessionId}`);
}
