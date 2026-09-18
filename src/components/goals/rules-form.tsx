"use client";

import { useActionState } from "react";
import { saveRules, type RulesActionState } from "@/app/(dashboard)/goals/actions";
import type { AllocationRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RulesActionState = { error: null };

export function RulesForm({ rules }: { rules: AllocationRule[] }) {
  const [state, formAction, pending] = useActionState(saveRules, initialState);
  const byCategory = new Map(rules.map((r) => [r.category, r.max_pct]));

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="overall">Overall weekly cap (%)</Label>
          <Input
            id="overall"
            name="overall"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="No limit"
            defaultValue={byCategory.get("OVERALL") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="GPP">GPP weekly cap (%)</Label>
          <Input
            id="GPP"
            name="GPP"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="No limit"
            defaultValue={byCategory.get("GPP") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="CASH">Cash weekly cap (%)</Label>
          <Input
            id="CASH"
            name="CASH"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="No limit"
            defaultValue={byCategory.get("CASH") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="CASH_H2H">H2H weekly cap (%)</Label>
          <Input
            id="CASH_H2H"
            name="CASH_H2H"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="No limit"
            defaultValue={byCategory.get("CASH_H2H") ?? ""}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave a field blank for no cap. H2H is a share of bankroll, same as the others — not a share of
        the Cash budget, so keep that in mind when converting from a "% of Cash" plan. These drive the
        live warning when you log an entry.
      </p>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save rules"}
      </Button>
    </form>
  );
}
