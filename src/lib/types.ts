// Hand-written types matching supabase/migrations/0001_init.sql.
// If you install the Supabase CLI later, replace this with generated types via:
//   supabase gen types typescript --project-id <ref> > src/lib/types.ts

export type ContestCategory = "GPP" | "CASH";
export type TransactionType = "deposit" | "withdrawal" | "adjustment";
export type GoalPeriodType = "season" | "month" | "week";
export type GoalMetric =
  | "bankroll_growth"
  | "roi_target"
  | "max_allocation_pct"
  | "discipline_streak";

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

export interface CsvImport {
  id: string;
  user_id: string;
  platform_id: string;
  filename: string;
  imported_at: string;
  row_count: number;
}

// Note: no hand-rolled `Database` type here on purpose — @supabase/supabase-js's
// generic inference is strict about the exact shape (Relationships, etc.) and a
// partial hand-written version fights it more than it helps. The Supabase clients
// (src/lib/supabase/{client,server}.ts) are left unparameterized; query results
// are typed at the call site using the Row types above instead. Once you've run
// `supabase gen types typescript` against a real project, wire the generated
// Database type into both clients for full end-to-end type safety.
