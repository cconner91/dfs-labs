"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTransaction, type TransactionActionState } from "@/app/(dashboard)/bankroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
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

const initialState: TransactionActionState = { error: null };

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(addTransaction, initialState);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const hasSubmitted = useRef(false);

  // Close the dialog once a submission finishes successfully; leave it open (with the
  // error shown) if the server action returned a validation/save error.
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
      <DialogTrigger render={<Button>Add transaction</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bankroll transaction</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="deposit">
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Date</Label>
            <Input id="occurred_at" name="occurred_at" type="date" defaultValue={today} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" type="text" placeholder="e.g. weekly deposit" />
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
