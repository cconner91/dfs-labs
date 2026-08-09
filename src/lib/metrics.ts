import type { Entry } from "@/lib/types";

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
