"use client";

import { useActionState } from "react";
import { saveLimits, type LimitsActionState } from "@/app/(dashboard)/goals/actions";
import type { WeeklyContestLimit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LimitsActionState = { error: null };

export function LimitsForm({ limits }: { limits: WeeklyContestLimit[] }) {
  const [state, formAction, pending] = useActionState(saveLimits, initialState);
  const byMetric = new Map(limits.map((l) => [l.metric, l.max_count]));

  return (
    <form action={formAction} className="space-y-4">
      <div className="max-w-xs space-y-2">
        <Label htmlFor="large_field_gpp_count">Max large-field GPPs (150+ entries) per week</Label>
        <Input
          id="large_field_gpp_count"
          name="large_field_gpp_count"
          type="number"
          step="1"
          min="1"
          placeholder="No limit"
          defaultValue={byMetric.get("large_field_gpp_count") ?? ""}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Counts distinct "Large Field" GPP entries logged this week, not lineups within one entry. Leave
        blank for no cap.
      </p>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save limit"}
      </Button>
    </form>
  );
}
