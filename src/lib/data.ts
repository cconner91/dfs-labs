import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  AllocationRule,
  BankrollAccount,
  BankrollTransaction,
  ContestSubtype,
  ContestTemplate,
  Entry,
  Goal,
  Lineup,
  Platform,
  Week,
  WeeklyContestLimit,
} from "@/lib/types";

/** Throws if there's no logged-in user — every dashboard page is behind auth middleware anyway. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getPlatforms(supabase: SupabaseClient): Promise<Platform[]> {
  const { data, error } = await supabase.from("platforms").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getContestSubtypes(supabase: SupabaseClient): Promise<ContestSubtype[]> {
  const { data, error } = await supabase
    .from("contest_subtypes")
    .select("*")
    .order("category")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getWeeks(supabase: SupabaseClient): Promise<Week[]> {
  const { data, error } = await supabase.from("weeks").select("*").order("week_number");
  if (error) throw error;
  return data ?? [];
}

/** The week containing today's date, falling back to the nearest upcoming or most recent week. */
export async function getCurrentWeek(supabase: SupabaseClient): Promise<Week | null> {
  const weeks = await getWeeks(supabase);
  if (weeks.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const current = weeks.find((w) => w.start_date <= today && today <= w.end_date);
  if (current) return current;

  const upcoming = weeks.filter((w) => w.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming.length > 0) return upcoming[0];

  return weeks[weeks.length - 1];
}

/**
 * Returns the user's DraftKings bankroll account, creating it on first use so
 * Phase 1 doesn't need a dedicated account-management screen.
 */
export async function getOrCreateDefaultAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<BankrollAccount> {
  const { data: existing, error: existingError } = await supabase
    .from("bankroll_accounts")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const platforms = await getPlatforms(supabase);
  const draftKings = platforms.find((p) => p.name === "DraftKings") ?? platforms[0];
  if (!draftKings) throw new Error("No platforms seeded — run supabase/migrations/0001_init.sql");

  const { data: created, error: createError } = await supabase
    .from("bankroll_accounts")
    .insert({ user_id: userId, platform_id: draftKings.id, name: "DraftKings" })
    .select("*")
    .single();
  if (createError) throw createError;
  return created;
}

export async function getTransactions(
  supabase: SupabaseClient,
  accountId: string
): Promise<BankrollTransaction[]> {
  const { data, error } = await supabase
    .from("bankroll_transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function currentBalance(transactions: BankrollTransaction[]): number {
  return balanceAsOf(transactions, null);
}

/**
 * Running bankroll balance as of a given instant (all transactions up to and including it),
 * or the full running total when `asOfIso` is null. Used to show allocation % against the
 * bankroll as it actually stood at the time of each entry, not today's balance.
 */
export function balanceAsOf(transactions: BankrollTransaction[], asOfIso: string | null): number {
  return transactions.reduce((sum, t) => {
    if (asOfIso !== null && t.occurred_at > asOfIso) return sum;
    if (t.type === "withdrawal") return sum - t.amount;
    return sum + t.amount; // deposit and adjustment both add (adjustments can be negative amounts)
  }, 0);
}

export async function getEntries(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {}
): Promise<Entry[]> {
  let query = supabase
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .order("entered_at", { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLineups(supabase: SupabaseClient, userId: string): Promise<Lineup[]> {
  const { data, error } = await supabase
    .from("lineups")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllocationRules(
  supabase: SupabaseClient,
  userId: string
): Promise<AllocationRule[]> {
  const { data, error } = await supabase
    .from("allocation_rules")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getContestTemplates(
  supabase: SupabaseClient,
  userId: string
): Promise<ContestTemplate[]> {
  const { data, error } = await supabase
    .from("contest_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getWeeklyContestLimits(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyContestLimit[]> {
  const { data, error } = await supabase
    .from("weekly_contest_limits")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getGoals(supabase: SupabaseClient, userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
