"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addGoal, type GoalActionState } from "@/app/(dashboard)/goals/actions";
import type { GoalMetric, GoalPeriodType, Week } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: GoalActionState = { error: null };

export function GoalForm({ weeks, seasonYear }: { weeks: Week[]; seasonYear: number }) {
  const [state, formAction, pending] = useActionState(addGoal, initialState);
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<GoalPeriodType>("season");
  const [metric, setMetric] = useState<GoalMetric>("bankroll_growth");
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current && !pending && state.error === null) {
      setOpen(false);
      hasSubmitted.current = false;
    }
  }, [pending, state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) hasSubmitted.current = false;
      }}
    >
      <DialogTrigger render={<Button>Add goal</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add goal</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="metric">Metric</Label>
            <Select
              name="metric"
              value={metric}
              onValueChange={(v) => setMetric(v as GoalMetric)}
            >
              <SelectTrigger id="metric" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bankroll_growth">Bankroll growth</SelectItem>
                <SelectItem value="roi_target">ROI target</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_type">Period</Label>
            <Select
              name="period_type"
              value={periodType}
              onValueChange={(v) => setPeriodType(v as GoalPeriodType)}
            >
              <SelectTrigger id="period_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="season">Season</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "season" && (
            <input type="hidden" name="period_ref" value={String(seasonYear)} />
          )}
          {periodType === "month" && (
            <div className="space-y-2">
              <Label htmlFor="period_ref_month">Month</Label>
              <Input
                id="period_ref_month"
                name="period_ref"
                type="month"
                defaultValue={new Date().toISOString().slice(0, 7)}
                required
              />
            </div>
          )}
          {periodType === "week" && (
            <div className="space-y-2">
              <Label htmlFor="period_ref_week">Week</Label>
              <Select name="period_ref">
                <SelectTrigger id="period_ref_week" className="w-full">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Week {w.week_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target_value">
              Target {metric === "bankroll_growth" ? "growth" : "ROI"} (%)
            </Label>
            <Input id="target_value" name="target_value" type="number" step="0.1" required />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
