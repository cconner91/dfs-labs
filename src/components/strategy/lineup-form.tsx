"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addLineup, type LineupActionState } from "@/app/(dashboard)/strategy/actions";
import type { Week } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: LineupActionState = { error: null };

export function LineupForm({ weeks, defaultWeekId }: { weeks: Week[]; defaultWeekId: string | null }) {
  const [state, formAction, pending] = useActionState(addLineup, initialState);
  const [open, setOpen] = useState(false);
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
      <DialogTrigger render={<Button>New strategy note</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly lineup strategy</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
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
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" placeholder="e.g. Week 3 game plan" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategy_notes">Strategy / thesis</Label>
            <Textarea
              id="strategy_notes"
              name="strategy_notes"
              rows={4}
              placeholder="What's the plan this week? Which games/spots are you attacking, cash vs GPP split, overall exposure targets..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stack_notes">Stacking / exposure notes</Label>
            <Textarea
              id="stack_notes"
              name="stack_notes"
              rows={3}
              placeholder="Key stacks, player exposure caps, contrarian plays..."
            />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
