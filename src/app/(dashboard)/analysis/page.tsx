import { getContestSubtypes, getEntries, requireUser } from "@/lib/data";
import { aggregateProfit, aggregateRoi, breakdownBySubtype, entryCost, formatCurrency, formatPercent } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakdownTable } from "@/components/analysis/breakdown-table";

export default async function AnalysisPage() {
  const { supabase, user } = await requireUser();
  const [entries, contestSubtypes] = await Promise.all([
    getEntries(supabase, user.id),
    getContestSubtypes(supabase),
  ]);

  const subtypeById = new Map(contestSubtypes.map((s) => [s.id, s]));
  const gppEntries = entries.filter((e) => subtypeById.get(e.contest_subtype_id)?.category === "GPP");
  const cashEntries = entries.filter((e) => subtypeById.get(e.contest_subtype_id)?.category === "CASH");

  const gppRows = breakdownBySubtype(gppEntries, contestSubtypes);
  const cashRows = breakdownBySubtype(cashEntries, contestSubtypes);

  const summaries = [
    { label: "GPP", entries: gppEntries },
    { label: "Cash", entries: cashEntries },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Result Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click a column header to sort. Cash % is any money back; Win % is beating your total cost.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {summaries.map(({ label, entries: catEntries }) => {
          const staked = catEntries.reduce((sum, e) => sum + entryCost(e), 0);
          const profit = aggregateProfit(catEntries);
          const roi = aggregateRoi(catEntries);
          return (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label} overall</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-semibold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}
                >
                  {formatCurrency(profit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {catEntries.length} entries &middot; {formatCurrency(staked)} staked &middot; {formatPercent(roi)} ROI
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GPP by contest type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <BreakdownTable rows={gppRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash by contest type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <BreakdownTable rows={cashRows} />
        </CardContent>
      </Card>
    </div>
  );
}
