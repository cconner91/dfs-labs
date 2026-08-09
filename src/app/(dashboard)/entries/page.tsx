import {
  balanceAsOf,
  currentBalance,
  getContestSubtypes,
  getCurrentWeek,
  getEntries,
  getOrCreateDefaultAccount,
  getTransactions,
  getWeeks,
  requireUser,
} from "@/lib/data";
import { allocationPct, entryCost, entryProfit, entryRoi, formatCurrency, formatPercent } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntryForm } from "@/components/entries/entry-form";
import { DeleteEntryButton } from "@/components/entries/delete-entry-button";

export default async function EntriesPage() {
  const { supabase, user } = await requireUser();
  const [weeks, contestSubtypes, entries, currentWeek, account] = await Promise.all([
    getWeeks(supabase),
    getContestSubtypes(supabase),
    getEntries(supabase, user.id),
    getCurrentWeek(supabase),
    getOrCreateDefaultAccount(supabase, user.id),
  ]);
  const transactions = await getTransactions(supabase, account.id);
  const balance = currentBalance(transactions);

  const weekById = new Map(weeks.map((w) => [w.id, w]));
  const subtypeById = new Map(contestSubtypes.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Entries</h1>
        <EntryForm
          weeks={weeks}
          contestSubtypes={contestSubtypes}
          defaultWeekId={currentWeek?.id ?? null}
          bankrollBalance={balance}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No entries logged yet. Add your first contest entry to start tracking ROI.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Contest</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Winnings</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Alloc %</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const week = weekById.get(e.week_id);
                  const subtype = subtypeById.get(e.contest_subtype_id);
                  const profit = entryProfit(e);
                  const roi = entryRoi(e);
                  const balanceAtEntry = balanceAsOf(transactions, e.entered_at);
                  const alloc = allocationPct(e, balanceAtEntry);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.entered_at).toLocaleDateString()}</TableCell>
                      <TableCell>{week ? `Wk ${week.week_number}` : "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{e.contest_name}</TableCell>
                      <TableCell>
                        {subtype && (
                          <Badge variant={subtype.category === "GPP" ? "default" : "secondary"}>
                            {subtype.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entryCost(e))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(e.winnings)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${profit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}
                      >
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-right">{formatPercent(roi)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercent(alloc)}
                      </TableCell>
                      <TableCell>
                        <DeleteEntryButton entryId={e.id} contestName={e.contest_name} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
