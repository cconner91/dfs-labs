import Link from "next/link";
import {
  currentBalance,
  getAllocationRules,
  getContestSubtypes,
  getCurrentWeek,
  getEntries,
  getOrCreateDefaultAccount,
  getTransactions,
  getWeeklyContestLimits,
  requireUser,
} from "@/lib/data";
import {
  aggregateRoi,
  entryCost,
  entryProfit,
  formatCurrency,
  formatPercent,
  rulesFromAllocationRules,
  weeklyLargeFieldGppCount,
  weeklySpendByCategory,
} from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekVsRulesCard } from "@/components/rules/week-vs-rules-card";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [account, currentWeek, contestSubtypes, allocationRules, weeklyLimits] = await Promise.all([
    getOrCreateDefaultAccount(supabase, user.id),
    getCurrentWeek(supabase),
    getContestSubtypes(supabase),
    getAllocationRules(supabase, user.id),
    getWeeklyContestLimits(supabase, user.id),
  ]);
  const [transactions, entries] = await Promise.all([
    getTransactions(supabase, account.id),
    getEntries(supabase, user.id),
  ]);

  const balance = currentBalance(transactions);
  const thisWeekEntries = currentWeek ? entries.filter((e) => e.week_id === currentWeek.id) : [];
  const thisWeekCost = thisWeekEntries.reduce((s, e) => s + entryCost(e), 0);
  const thisWeekProfit = thisWeekEntries.reduce((s, e) => s + entryProfit(e), 0);
  const subtypeById = new Map(contestSubtypes.map((c) => [c.id, c]));
  const rules = rulesFromAllocationRules(allocationRules);
  const weekSpend = weeklySpendByCategory(entries, subtypeById);
  const largeFieldGppCount = weeklyLargeFieldGppCount(entries, subtypeById);
  const largeFieldGppCap =
    weeklyLimits.find((l) => l.metric === "large_field_gpp_count")?.max_count ?? null;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentEntries = entries.filter((e) => new Date(e.entered_at) >= fourWeeksAgo);
  const recentRoi = aggregateRoi(recentEntries);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current bankroll</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
            <Link href="/bankroll" className="text-xs text-muted-foreground underline underline-offset-4">
              View ledger
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {currentWeek ? `Week ${currentWeek.week_number} at a glance` : "This week"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {thisWeekEntries.length} {thisWeekEntries.length === 1 ? "entry" : "entries"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(thisWeekCost)} staked &middot;{" "}
              <span className={thisWeekProfit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}>
                {formatCurrency(thisWeekProfit)} so far
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 4 weeks ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatPercent(recentRoi)}</p>
            <p className="text-xs text-muted-foreground">{recentEntries.length} entries</p>
          </CardContent>
        </Card>
      </div>

      {currentWeek &&
        (rules.overall !== null ||
          rules.GPP !== null ||
          rules.CASH !== null ||
          rules.CASH_H2H !== null ||
          largeFieldGppCap !== null) && (
          <WeekVsRulesCard
            weekLabel={`Week ${currentWeek.week_number}`}
            spend={weekSpend.get(currentWeek.id) ?? { overall: 0, GPP: 0, CASH: 0, CASH_H2H: 0 }}
            bankrollBalance={balance}
            rules={rules}
            largeFieldGppCount={largeFieldGppCount.get(currentWeek.id) ?? 0}
            largeFieldGppCap={largeFieldGppCap}
          />
        )}

      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/strategy">Plan this week&apos;s strategy</Link>} />
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/entries">Log a contest entry</Link>}
        />
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/bankroll">Update bankroll</Link>}
        />
      </div>
    </div>
  );
}
