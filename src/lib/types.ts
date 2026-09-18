// Hand-written types matching supabase/migrations/0001_init.sql.
// If you install the Supabase CLI later, replace this with generated types via:
//   supabase gen types typescript --project-id <ref> > src/lib/types.ts

export type ContestCategory = "GPP" | "CASH";
export type TransactionType = "deposit" | "withdrawal" | "adjustment";
export type GoalPeriodType = "season" | "month" | "week";
export type GoalMetric = "bankroll_growth" | "roi_target" | "discipline_streak";
export type RuleCategory = "OVERALL" | "GPP" | "CASH" | "CASH_H2H";
export type SlateType = "classic" | "showdown";

export interface Platform {
  id: string;
  name: string;
}

export interface Season {
  id: string;
  year: number;
  sport: string;
}

export interface Week {
  id: string;
  season_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
}

export interface ContestSubtype {
  id: string;
  category: ContestCategory;
  name: string;
  sort_order: number;
}

export interface BankrollAccount {
  id: string;
  user_id: string;
  platform_id: string;
  name: string;
  created_at: string;
}

export interface BankrollTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  occurred_at: string;
  note: string | null;
}

export interface Lineup {
  id: string;
  user_id: string;
  week_id: string;
  label: string;
  strategy_notes: string | null;
  stack_notes: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  week_id: string;
  lineup_id: string | null;
  platform_id: string;
  contest_subtype_id: string;
  contest_name: string;
  entry_fee: number;
  num_entries: number;
  entered_at: string;
  winnings: number;
  placement: number | null;
  notes: string | null;
  slate_type: SlateType;
}

export interface Goal {
  id: string;
  user_id: string;
  period_type: GoalPeriodType;
  period_ref: string;
  metric: GoalMetric;
  target_value: number;
  created_at: string;
}

export interface AllocationRule {
  id: string;
  user_id: string;
  category: RuleCategory;
  max_pct: number; // whole percent, e.g. 15 = 15%
  updated_at: string;
}

/** Convenience shape for the entry form / rule-compliance UI: one cap per category, in whole percent. */
export interface Rules {
  overall: number | null;
  GPP: number | null;
  CASH: number | null;
  CASH_H2H: number | null;
}

export type WeeklyLimitMetric = "large_field_gpp_count";

export interface WeeklyContestLimit {
  id: string;
  user_id: string;
  metric: WeeklyLimitMetric;
  max_count: number;
  updated_at: string;
}

export type TemplateSource = "manual" | "draftkings_lobby";

export interface ContestTemplate {
  id: string;
  user_id: string;
  contest_subtype_id: string;
  label: string;
  suggested_contest_name: string | null;
  entry_fee: number | null;
  typical_num_entries: number;
  source: TemplateSource;
  created_at: string;
  updated_at: string;
}

export interface CsvImport {
  id: string;
  user_id: string;
  platform_id: string;
  filename: string;
  imported_at: string;
  row_count: number;
}

export type PoolType = "CASH" | "GPP";
export type Position = "QB" | "RB" | "WR" | "TE" | "DST";

export interface PlayerPoolEntry {
  id: string;
  user_id: string;
  week_id: string;
  pool_type: PoolType;
  dk_player_id: string;
  name: string;
  position: Position | null;
  team: string | null;
  salary: number | null;
  created_at: string;
}

// Note: no hand-rolled `Database` type here on purpose — @supabase/supabase-js's
// generic inference is strict about the exact shape (Relationships, etc.) and a
// partial hand-written version fights it more than it helps. The Supabase clients
// (src/lib/supabase/{client,server}.ts) are left unparameterized; query results
// are typed at the call site using the Row types above instead. Once you've run
// `supabase gen types typescript` against a real project, wire the generated
// Database type into both clients for full end-to-end type safety.
