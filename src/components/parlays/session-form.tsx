"use client";

import { useActionState, useState } from "react";
import { createSession, type ActionState } from "@/app/(dashboard)/parlays/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { error: null };

export function SessionForm() {
  const [state, formAction, pending] = useActionState(createSession, initialState);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New session</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New TD parlay session</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" placeholder="e.g. Week 3 TD Parlays" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_bankroll">Total bankroll</Label>
            <Input
              id="total_bankroll"
              name="total_bankroll"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="100"
              required
            />
            <p className="text-xs text-muted-foreground">
              Shared across every group you create in this session — each group draws its own
              allocation from this, and you'll see what's left as you go.
            </p>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
