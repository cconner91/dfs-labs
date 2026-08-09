"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { addEntry, type EntryActionState } from "@/app/(dashboard)/entries/actions";
import type { ContestSubtype, Week } from "@/lib/types";
import { formatPercent } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: EntryActionState = { error: null };

export function EntryForm({
  weeks,
  contestSubtypes,
  defaultWeekId,
  bankrollBalance,
}: {
  weeks: Week[];
  contestSubtypes: ContestSubtype[];
  defaultWeekId: string | null;
  bankrollBalance: number;
}) {
  const [state, formAction, pending] = useActionState(addEntry, initialState);
  const [open, setOpen] = useState(false);
  const [entryFee, setEntryFee] = useState(0);
  const [numEntries, setNumEntries] = useState(1);
  const hasSubmitted = useRef(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (hasSubmitted.current && !pending && state.error === null) {
      setOpen(false);
      hasSubmitted.current = false;
      setEntryFee(0);
      setNumEntries(1);
    }
  }, [pending, state]);

  const gpp = contestSubtypes.filter((c) => c.category === "GPP");
  const cash = contestSubtypes.filter((c) => c.category === "CASH");

  const totalCost = entryFee * numEntries;
  const allocationPct = bankrollBalance > 0 ? totalCost / bankrollBalance : null;

  const allocationTone = useMemo(() => {
    if (allocationPct === null) return "text-muted-foreground";
    if (allocationPct > 0.1) return "text-destructive";
    if (allocationPct > 0.05) return "text-amber-600 dark:text-amber-500";
    return "text-muted-foreground";
  }, [allocationPct]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) hasSubmitted.current = false;
      }}
    >
      <DialogTrigger render={<Button>Add entry</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add contest entry</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="week_id">Week</Label>
              <Select name="week_id" defaultValue={defaultWeekId ?? undefined}>
                <SelectTrigger id="week_id" className="w-full">
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
            <div className="space-y-2">
              <Label htmlFor="contest_subtype_id">Contest type</Label>
              <Select name="contest_subtype_id">
                <SelectTrigger id="contest_subtype_id" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>GPP</SelectLabel>
                    {gpp.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Cash</SelectLabel>
                    {cash.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contest_name">Contest name</Label>
            <Input id="contest_name" name="contest_name" placeholder="e.g. NFL Sunday Million" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry fee</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_entries"># of entries</Label>
              <Input
                id="num_entries"
                name="num_entries"
                type="number"
                min="1"
                step="1"
                value={numEntries}
                onChange={(e) => setNumEntries(Number(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          {bankrollBalance > 0 && (
            <p className={`text-sm ${allocationTone}`}>
              {formatPercent(allocationPct)} of current bankroll at risk on this entry
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entered_at">Date</Label>
              <Input id="entered_at" name="entered_at" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="winnings">Winnings (if settled)</Label>
              <Input id="winnings" name="winnings" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Stack/exposure notes for this entry" rows={2} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
