import { getCurrentWeek, getLineups, getWeeks, requireUser } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineupForm } from "@/components/strategy/lineup-form";

export default async function StrategyPage() {
  const { supabase, user } = await requireUser();
  const [weeks, lineups, currentWeek] = await Promise.all([
    getWeeks(supabase),
    getLineups(supabase, user.id),
    getCurrentWeek(supabase),
  ]);
  const weekById = new Map(weeks.map((w) => [w.id, w]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write the plan before you play — then hold results in Entries up against it.
          </p>
        </div>
        <LineupForm weeks={weeks} defaultWeekId={currentWeek?.id ?? null} />
      </div>

      {lineups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No strategy notes yet. Start one for this week before you build lineups.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lineups.map((lineup) => {
            const week = weekById.get(lineup.week_id);
            return (
              <Card key={lineup.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{lineup.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {week ? `Week ${week.week_number}` : ""} &middot;{" "}
                    {new Date(lineup.created_at).toLocaleDateString()}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lineup.strategy_notes && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Strategy
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{lineup.strategy_notes}</p>
                    </div>
                  )}
                  {lineup.stack_notes && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Stacks / exposure
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{lineup.stack_notes}</p>
                    </div>
                  )}
                  {!lineup.strategy_notes && !lineup.stack_notes && (
                    <p className="text-sm text-muted-foreground">No notes added.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
