// TD Parlay Optimizer — standalone domain, deliberately not shared with the DFS types in
// src/lib/types.ts (different bet type, different bankroll, no interaction between the two).

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type SkillPosition = "QB" | "RB" | "WR" | "TE";
export type ContrarianBucket = "chalk" | "moderate" | "contrarian" | "unranked";

export interface TdParlaySession {
  id: string;
  user_id: string;
  label: string;
  total_bankroll: number | null;
  created_at: string;
}

export interface TdParlayPlayer {
  id: string;
  session_id: string;
  name: string;
  team: string | null;
  american_odds: number | null;
  created_at: string;
  position: SkillPosition | null;
  opponent: string | null;
  is_home: boolean | null;
  game_time: string | null;
  over_under: number | null;
}

/** One row of this week's real, ESPN-sourced matchup data — not persisted, fetched fresh per page load. */
export interface WeeklyPlayerRow {
  espn_id: string;
  name: string;
  position: SkillPosition;
  team: string;
  opponent: string;
  is_home: boolean;
  game_time: string;
  over_under: number | null;
  /** Best-available real anytime-TD odds from SportsGameOdds, or null if unavailable/not configured. */
  american_odds: number | null;
}

export interface TdParlayGroup {
  id: string;
  session_id: string;
  label: string;
  bankroll: number;
  num_parlays: number;
  /** null = "Multi" (diversified leg-count spread), otherwise a fixed count 2-10. */
  legs_per_parlay: number | null;
  risk_level: RiskLevel;
  /** null = the engine's default (~50%) cap. */
  max_exposure_pct: number | null;
  created_at: string;
}

export interface SavedParlayLeg {
  player_id: string;
  name: string;
  team: string | null;
  american_odds: number;
  implied_probability: number;
}

export interface SavedParlay {
  id: string;
  group_id: string;
  legs: SavedParlayLeg[];
  combined_probability: number;
  payout_multiplier: number;
  stake: number;
  created_at: string;
}

/** A freshly generated (not-yet-saved) parlay from the client-side engine. */
export interface GeneratedParlay {
  legs: SavedParlayLeg[];
  combinedProbability: number;
  payoutMultiplier: number;
  stake: number;
  potentialPayout: number;
}
