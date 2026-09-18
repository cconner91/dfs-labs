import type { AllocationRule, ContestSubtype, Entry, Rules } from "@/lib/types";

/** Total staked on an entry: entry fee × number of entries. */
export function entryCost(entry: Pick<Entry, "entry_fee" | "num_entries">): number {
  return entry.entry_fee * entry.num_entries;
}

/** Net profit/loss on an entry: winnings minus total cost. */
export function entryProfit(entry: Pick<Entry, "entry_fee" | "num_entries" | "winnings">): number {
  return entry.winnings - entryCost(entry);
}

/** ROI as a fraction (0.5 = +50%), or null when there was no cost to divide by. */
export function entryRoi(
  entry: Pick<Entry, "entry_fee" | "num_entries" | "winnings">
): number | null {
  const cost = entryCost(entry);
  if (cost === 0) return null;
  return entryProfit(entry) / cost;
}

/** Aggregate ROI across a set of entries: total profit / total cost. */
export function aggregateRoi(entries: Pick<Entry, "entry_fee" | "num_entries" | "winnings">[]): number | null {
  const totalCost = entries.reduce((sum, e) => sum + entryCost(e), 0);
  if (totalCost === 0) return null;
  const totalProfit = entries.reduce((sum, e) => sum + entryProfit(e), 0);
  return totalProfit / totalCost;
}

/** What % of a given bankroll balance an entry's total cost represents. */
export function allocationPct(
  entry: Pick<Entry, "entry_fee" | "num_entries">,
  bankrollBalance: number
): number | null {
  if (bankrollBalance <= 0) return null;
  return entryCost(entry) / bankrollBalance;
}

/** Aggregate net profit across a set of entries. */
export function aggregateProfit(
  entries: Pick<Entry, "entry_fee" | "num_entries" | "winnings">[]
): number {
  return entries.reduce((sum, e) => sum + entryProfit(e), 0);
}

export interface WeekSpend {
  overall: number;
  GPP: number;
  CASH: number;
  CASH_H2H: number;
}

const EMPTY_WEEK_SPEND: WeekSpend = { overall: 0, GPP: 0, CASH: 0, CASH_H2H: 0 };

/**
 * Total cost staked per week, split by contest category (plus a Head-to-Head sub-bucket
 * within Cash). Used both for the live allocation-rule warning in the entry form and for
 * "this week vs. rules" summaries.
 */
export function weeklySpendByCategory(
  entries: Entry[],
  subtypeById: Map<string, ContestSubtype>
): Map<string, WeekSpend> {
  const byWeek = new Map<string, WeekSpend>();
  for (const entry of entries) {
    const subtype = subtypeById.get(entry.contest_subtype_id);
    if (!subtype) continue;
    const spend = byWeek.get(entry.week_id) ?? { ...EMPTY_WEEK_SPEND };
    const cost = entryCost(entry);
    spend.overall += cost;
    spend[subtype.category] += cost;
    if (subtype.category === "CASH" && subtype.name === "Head-to-Head") {
      spend.CASH_H2H += cost;
    }
    byWeek.set(entry.week_id, spend);
  }
  return byWeek;
}

/** How many "Large Field" GPP entries have been logged per week — checked against a count cap. */
export function weeklyLargeFieldGppCount(
  entries: Entry[],
  subtypeById: Map<string, ContestSubtype>
): Map<string, number> {
  const byWeek = new Map<string, number>();
  for (const entry of entries) {
    const subtype = subtypeById.get(entry.contest_subtype_id);
    if (!subtype || subtype.category !== "GPP" || subtype.name !== "Large Field") continue;
    byWeek.set(entry.week_id, (byWeek.get(entry.week_id) ?? 0) + 1);
  }
  return byWeek;
}

export interface BreakdownRow {
  subtypeId: string;
  category: ContestSubtype["category"];
  name: string;
  entries: number;
  staked: number;
  winnings: number;
  profit: number;
  roi: number | null;
  /** Share of entries (rows) that beat their cost, i.e. entryProfit > 0. */
  winRate: number | null;
  /** Share of entries (rows) that returned any money at all, i.e. winnings > 0. */
  cashRate: number | null;
}

/**
 * Per-contest-sub-type performance breakdown. Only sub-types with at least one entry are
 * returned, in the given subtypes' natural (category, sort_order) order.
 */
export function breakdownBySubtype(entries: Entry[], subtypes: ContestSubtype[]): BreakdownRow[] {
  const bySubtype = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = bySubtype.get(entry.contest_subtype_id) ?? [];
    list.push(entry);
    bySubtype.set(entry.contest_subtype_id, list);
  }

  const rows: BreakdownRow[] = [];
  for (const subtype of subtypes) {
    const rowEntries = bySubtype.get(subtype.id);
    if (!rowEntries || rowEntries.length === 0) continue;

    const staked = rowEntries.reduce((sum, e) => sum + entryCost(e), 0);
    const winnings = rowEntries.reduce((sum, e) => sum + e.winnings, 0);
    const profit = aggregateProfit(rowEntries);
    const winCount = rowEntries.filter((e) => entryProfit(e) > 0).length;
    const cashCount = rowEntries.filter((e) => e.winnings > 0).length;

    rows.push({
      subtypeId: subtype.id,
      category: subtype.category,
      name: subtype.name,
      entries: rowEntries.length,
      staked,
      winnings,
      profit,
      roi: aggregateRoi(rowEntries),
      winRate: winCount / rowEntries.length,
      cashRate: cashCount / rowEntries.length,
    });
  }
  return rows;
}

/** Reshapes the flat allocation_rules rows into the { overall, GPP, CASH } lookup the UI wants. */
export function rulesFromAllocationRules(rows: AllocationRule[]): Rules {
  const byCategory = new Map(rows.map((r) => [r.category, r.max_pct]));
  return {
    overall: byCategory.get("OVERALL") ?? null,
    GPP: byCategory.get("GPP") ?? null,
    CASH: byCategory.get("CASH") ?? null,
    CASH_H2H: byCategory.get("CASH_H2H") ?? null,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}
