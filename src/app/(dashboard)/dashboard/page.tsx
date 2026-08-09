import Link from "next/link";
import {
  currentBalance,
  getCurrentWeek,
  getEntries,
  getOrCreateDefaultAccount,
  getTransactions,
  requireUser,
} from "@/lib/data";
import { aggregateRoi, entryCost, entryProfit, formatCurrency, formatPercent } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [account, currentWeek] = await Promise.all([
    getOrCreateDefaultAccount(supabase, user.id),
    getCurrentWeek(supabase),
  ]);
  const [transactions, entries] = await Promise.all([
    getTransactions(supabase, account.id),
    getEntries(supabase, user.id),
  ]);

  const balance = currentBalance(transactions);
  const thisWeekEntries = currentWeek ? entries.filter((e) => e.week_id === currentWeek.id) : [];
  const thisWeekCost = thisWeekEntries.reduce((s, e) => s + entryCost(e), 0);
  const thisWeekProfit = thisWeekEntries.reduce((s, e) => s + entryProfit(e), 0);

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

      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/strategy">Plan this week&apos;s strategy</Link>} />
        <Button variant="outline" render={<Link href="/entries">Log a contest entry</Link>} />
        <Button variant="outline" render={<Link href="/bankroll">Update bankroll</Link>} />
      </div>
    </div>
  );
}
