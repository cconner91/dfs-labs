import { getEntries, getWeeks, requireUser } from "@/lib/data";
import { aggregateProfit, aggregateRoi, formatCurrency, formatPercent } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyProfitChart } from "@/components/trends/weekly-profit-chart";
import { CumulativeProfitChart } from "@/components/trends/cumulative-profit-chart";

export default async function TrendsPage() {
  const { supabase, user } = await requireUser();
  const [entries, weeks] = await Promise.all([getEntries(supabase, user.id), getWeeks(supabase)]);

  const weeksWithEntries = weeks
    .map((week) => ({ week, entries: entries.filter((e) => e.week_id === week.id) }))
    .filter((w) => w.entries.length > 0)
    .sort((a, b) => a.week.week_number - b.week.week_number);

  let running = 0;
  const weeklyProfitData = weeksWithEntries.map(({ week, entries: weekEntries }) => {
    const profit = aggregateProfit(weekEntries);
    running += profit;
    return {
      weekLabel: `Wk ${week.week_number}`,
      profit,
      cumulativeProfit: Math.round(running * 100) / 100,
    };
  });

  const seasonProfit = aggregateProfit(entries);
  const seasonRoi = aggregateRoi(entries);
  const best = weeklyProfitData.reduce<(typeof weeklyProfitData)[number] | null>(
    (max, w) => (max === null || w.profit > max.profit ? w : max),
    null
  );
  const worst = weeklyProfitData.reduce<(typeof weeklyProfitData)[number] | null>(
    (min, w) => (min === null || w.profit < min.profit ? w : min),
    null
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Performance Trends</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Season profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-semibold ${seasonProfit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}
            >
              {formatCurrency(seasonProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Season ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatPercent(seasonRoi)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-500">
              {best ? formatCurrency(best.profit) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{best?.weekLabel ?? ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Worst week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-destructive">{worst ? formatCurrency(worst.profit) : "—"}</p>
            <p className="text-xs text-muted-foreground">{worst?.weekLabel ?? ""}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly profit/loss</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyProfitChart data={weeklyProfitData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumulative performance</CardTitle>
        </CardHeader>
        <CardContent>
          <CumulativeProfitChart data={weeklyProfitData} />
        </CardContent>
      </Card>
    </div>
  );
}
