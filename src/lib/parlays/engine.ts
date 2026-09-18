// Pure, client-safe TD parlay generation — no Supabase/server imports, so it can run
// instantly in the browser on every "Generate" click with no round-trip.

import type { ContrarianBucket, GeneratedParlay, RiskLevel, SavedParlayLeg, TdParlayPlayer } from "./types";

/** A pool player that's actually usable in a parlay — odds have been entered. */
type OddedPlayer = TdParlayPlayer & { american_odds: number };

export function americanOddsToImpliedProbability(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export function americanOddsToDecimalOdds(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

/** Implied-probability eligibility bands per risk level. Tunable — not a precise science. */
export const RISK_BANDS: Record<RiskLevel, { min: number; max: number }> = {
  conservative: { min: 0.35, max: 1 },
  balanced: { min: 0.18, max: 0.4 },
  aggressive: { min: 0.06, max: 0.25 },
};

/** Default cap when a group doesn't set its own — a player in at most ~half the parlays. */
const DEFAULT_MAX_EXPOSURE_PCT = 50;

function exposureCapFor(numParlays: number, maxExposurePct: number | null): number {
  const pct = maxExposurePct ?? DEFAULT_MAX_EXPOSURE_PCT;
  return Math.max(1, Math.ceil((numParlays * pct) / 100));
}

/** "Multi" leg mode spreads a group's parlays across this range instead of one fixed leg count. */
const MULTI_LEG_RANGE = [3, 4, 5, 6, 7];

/** One leg-count per parlay slot, cycled through MULTI_LEG_RANGE and shuffled for variance. */
function buildMultiLegAssignments(numParlays: number): number[] {
  const assignments = Array.from(
    { length: numParlays },
    (_, i) => MULTI_LEG_RANGE[i % MULTI_LEG_RANGE.length]
  );
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }
  return assignments;
}

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function comboKey(players: OddedPlayer[]): string {
  return players
    .map((p) => p.id)
    .sort()
    .join(",");
}

export interface GenerateParlaysConfig {
  numParlays: number;
  /** null = "Multi" — diversifies leg-counts across the group's parlays instead of one fixed count. */
  legsPerParlay: number | null;
  riskLevel: RiskLevel;
  bankroll: number;
  /** null = engine default (~50%). */
  maxExposurePct: number | null;
}

export interface GenerateParlaysResult {
  parlays: GeneratedParlay[];
  warnings: string[];
}

export function generateParlaysForGroup(
  pool: TdParlayPlayer[],
  config: GenerateParlaysConfig
): GenerateParlaysResult {
  const { numParlays, legsPerParlay, riskLevel, bankroll, maxExposurePct } = config;
  const warnings: string[] = [];

  const legCounts = legsPerParlay === null ? buildMultiLegAssignments(numParlays) : Array(numParlays).fill(legsPerParlay);
  const maxLegsNeeded = Math.max(...legCounts);

  const withOdds: OddedPlayer[] = pool.filter((p): p is OddedPlayer => p.american_odds !== null);
  if (withOdds.length < pool.length) {
    warnings.push(
      `${pool.length - withOdds.length} player(s) in the pool have no odds entered yet — excluded from this generation.`
    );
  }

  if (withOdds.length < maxLegsNeeded) {
    return {
      parlays: [],
      warnings: [
        ...warnings,
        `Need at least ${maxLegsNeeded} players with odds entered to build a ${maxLegsNeeded}-leg parlay.`,
      ],
    };
  }

  const band = RISK_BANDS[riskLevel];
  let eligible = withOdds.filter((p) => {
    const prob = americanOddsToImpliedProbability(p.american_odds);
    return prob >= band.min && prob <= band.max;
  });
  if (eligible.length < maxLegsNeeded) {
    warnings.push(
      `Not enough players in the ${riskLevel} odds range — used the full odds-entered pool instead for this generation.`
    );
    eligible = withOdds;
  }

  const exposureCount = new Map<string, number>();
  const cap = exposureCapFor(numParlays, maxExposurePct);
  const usedCombos = new Set<string>();
  let hitRetryLimit = false;

  const rawParlays: OddedPlayer[][] = [];

  for (let i = 0; i < numParlays; i++) {
    const legsForThisParlay = legCounts[i];
    let picked: OddedPlayer[] = [];
    let underCap = eligible.filter((p) => (exposureCount.get(p.id) ?? 0) < cap);
    if (underCap.length < legsForThisParlay) underCap = eligible;

    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = sampleWithoutReplacement(underCap, legsForThisParlay);
      const key = comboKey(candidate);
      if (!usedCombos.has(key) || attempt === maxAttempts - 1) {
        picked = candidate;
        if (usedCombos.has(key)) hitRetryLimit = true;
        usedCombos.add(key);
        break;
      }
    }

    for (const p of picked) exposureCount.set(p.id, (exposureCount.get(p.id) ?? 0) + 1);
    rawParlays.push(picked);
  }

  if (hitRetryLimit) {
    warnings.push("Pool was small relative to the number of parlays requested — some combinations repeat.");
  }

  const withProbability = rawParlays.map((legs) => {
    const combinedProbability = legs.reduce(
      (product, p) => product * americanOddsToImpliedProbability(p.american_odds),
      1
    );
    const payoutMultiplier = legs.reduce(
      (product, p) => product * americanOddsToDecimalOdds(p.american_odds),
      1
    );
    const savedLegs: SavedParlayLeg[] = legs.map((p) => ({
      player_id: p.id,
      name: p.name,
      team: p.team,
      american_odds: p.american_odds,
      implied_probability: americanOddsToImpliedProbability(p.american_odds),
    }));
    return { legs: savedLegs, combinedProbability, payoutMultiplier };
  });

  const totalProbability = withProbability.reduce((sum, p) => sum + p.combinedProbability, 0);
  const parlays: GeneratedParlay[] = withProbability.map((p) => {
    const weight = totalProbability > 0 ? p.combinedProbability / totalProbability : 1 / withProbability.length;
    const stake = Math.round(bankroll * weight * 100) / 100;
    return {
      legs: p.legs,
      combinedProbability: p.combinedProbability,
      payoutMultiplier: p.payoutMultiplier,
      stake,
      potentialPayout: Math.round(stake * p.payoutMultiplier * 100) / 100,
    };
  });

  return { parlays, warnings };
}

// Ordered low (most contrarian) to high (most chalk) so an O/U nudge can shift one step either way.
const BUCKET_ORDER: Exclude<ContrarianBucket, "unranked">[] = ["contrarian", "moderate", "chalk"];

/**
 * Confidence-tier classification for the player browser. Deterministic, not a black box:
 * primary signal is implied probability from the entered odds; a high/low game total nudges
 * one tier either way as a simple stand-in for "game environment." No odds yet → "unranked"
 * rather than guessing.
 */
export function bucketForPlayer(odds: number | null, overUnder: number | null): ContrarianBucket {
  if (odds === null) return "unranked";

  const prob = americanOddsToImpliedProbability(odds);
  let index: number;
  if (prob >= 0.35) index = 2; // chalk
  else if (prob >= 0.18) index = 1; // moderate
  else index = 0; // contrarian

  if (overUnder !== null) {
    if (overUnder >= 48) index = Math.min(index + 1, BUCKET_ORDER.length - 1);
    else if (overUnder <= 42) index = Math.max(index - 1, 0);
  }

  return BUCKET_ORDER[index];
}
