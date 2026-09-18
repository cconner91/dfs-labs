import { deleteGoal } from "@/app/(dashboard)/goals/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/metrics";
import type { Goal } from "@/lib/types";

export function GoalCard({
  goal,
  periodLabel,
  currentValue,
}: {
  goal: Goal;
  periodLabel: string;
  /** Current value for the goal's metric, as a fraction (0.12 = 12%), or null if not yet computable. */
  currentValue: number | null;
}) {
  const targetFraction = goal.target_value / 100;
  const progressPct =
    currentValue === null || targetFraction === 0
      ? 0
      : Math.max(0, Math.min(100, (currentValue / targetFraction) * 100));
  const metricLabel = goal.metric === "bankroll_growth" ? "Bankroll growth" : "ROI";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          {metricLabel} &middot; {periodLabel}
        </CardTitle>
        <form action={deleteGoal.bind(null, goal.id)}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            Remove
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {currentValue === null ? "No data yet" : formatPercent(currentValue)}
          </span>
          <span className="text-muted-foreground">Target: {formatPercent(targetFraction)}</span>
        </div>
        <Progress value={progressPct} />
      </CardContent>
    </Card>
  );
}
