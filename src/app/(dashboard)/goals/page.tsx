import {
  balanceAsOf,
  currentBalance,
  getAllocationRules,
  getEntries,
  getGoals,
  getOrCreateDefaultAccount,
  getTransactions,
  getWeeklyContestLimits,
  getWeeks,
  requireUser,
} from "@/lib/data";
import { aggregateRoi } from "@/lib/metrics";
import type { Goal, Week } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesForm } from "@/components/goals/rules-form";
import { LimitsForm } from "@/components/goals/limits-form";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalCard } from "@/components/goals/goal-card";

function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function periodLabelFor(goal: Goal, weekById: Map<string, Week>, seasonYear: number): string {
  if (goal.period_type === "season") return `${seasonYear} season`;
  if (goal.period_type === "month") return monthLabel(goal.period_ref);
  const week = weekById.get(goal.period_ref);
  return week ? `Week ${week.week_number}` : "Unknown week";
}

export default async function GoalsPage() {
  const { supabase, user } = await requireUser();
  const [rules, limits, goals, weeks, entries, account] = await Promise.all([
    getAllocationRules(supabase, user.id),
    getWeeklyContestLimits(supabase, user.id),
    getGoals(supabase, user.id),
    getWeeks(supabase),
    getEntries(supabase, user.id),
    getOrCreateDefaultAccount(supabase, user.id),
  ]);
  const transactions = await getTransactions(supabase, account.id);
  const balance = currentBalance(transactions);

  const weekById = new Map(weeks.map((w) => [w.id, w]));
  const seasonStart = weeks.length > 0 ? weeks.reduce((a, b) => (a.start_date < b.start_date ? a : b)).start_date : null;
  const seasonYear = weeks[0]
    ? new Date(weeks[0].start_date).getFullYear()
    : new Date().getFullYear();

  function currentValueFor(goal: Goal): number | null {
    let periodStartIso: string | null = null;
    let periodEndIso: string | null = null;

    if (goal.period_type === "season") {
      periodStartIso = seasonStart ? new Date(seasonStart).toISOString() : null;
    } else if (goal.period_type === "month") {
      const [year, month] = goal.period_ref.split("-").map(Number);
      periodStartIso = new Date(year, month - 1, 1).toISOString();
      periodEndIso = new Date(year, month, 0, 23, 59, 59).toISOString();
    } else {
      const week = weekById.get(goal.period_ref);
      if (!week) return null;
      periodStartIso = new Date(week.start_date).toISOString();
      periodEndIso = new Date(week.end_date + "T23:59:59").toISOString();
    }

    if (goal.metric === "bankroll_growth") {
      if (!periodStartIso) return null;
      const startBalance = balanceAsOf(transactions, periodStartIso);
      if (startBalance <= 0) return null;
      return (balance - startBalance) / startBalance;
    }

    // roi_target
    const periodEntries = entries.filter((e) => {
      if (periodStartIso && e.entered_at < periodStartIso) return false;
      if (periodEndIso && e.entered_at > periodEndIso) return false;
      return true;
    });
    return aggregateRoi(periodEntries);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly allocation rules keep you disciplined in the moment; targets track how the season's
          actually going.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly allocation rules</CardTitle>
        </CardHeader>
        <CardContent>
          <RulesForm rules={rules} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly contest count limits</CardTitle>
        </CardHeader>
        <CardContent>
          <LimitsForm limits={limits} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Targets</h2>
          <GoalForm weeks={weeks} seasonYear={seasonYear} />
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No goals set yet. Add a season, month, or week target to track progress.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                periodLabel={periodLabelFor(goal, weekById, seasonYear)}
                currentValue={currentValueFor(goal)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
