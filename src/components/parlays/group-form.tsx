"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createGroup, type ActionState } from "@/app/(dashboard)/parlays/actions";
import type { RiskLevel, TdParlayPlayer } from "@/lib/parlays/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { error: null };
const LEG_OPTIONS = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function GroupForm({
  sessionId,
  players,
  totalBankroll,
  remaining,
}: {
  sessionId: string;
  players: TdParlayPlayer[];
  totalBankroll: number | null;
  remaining: number | null;
}) {
  const [state, formAction, pending] = useActionState(createGroup, initialState);
  const [open, setOpen] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("balanced");
  const [legsPerParlay, setLegsPerParlay] = useState("3");
  const [bankroll, setBankroll] = useState(0);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current && !pending && state.error === null) {
      setOpen(false);
      hasSubmitted.current = false;
      setSelectedPlayerIds(new Set());
      setRiskLevel("balanced");
      setLegsPerParlay("3");
      setBankroll(0);
    }
  }, [pending, state]);

  const overBudget = remaining !== null && bankroll > remaining;

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) hasSubmitted.current = false;
      }}
    >
      <DialogTrigger render={<Button>New group</Button>} />
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New parlay group</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="session_id" value={sessionId} />
          {[...selectedPlayerIds].map((id) => (
            <input key={id} type="hidden" name="player_ids" value={id} />
          ))}

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" placeholder="e.g. Group 1 — 5-leg" required />
          </div>

          {totalBankroll !== null && (
            <p className={`text-sm ${overBudget ? "text-destructive" : "text-muted-foreground"}`}>
              Remaining unallocated: {formatUsd(Math.max(remaining ?? 0, 0))} of {formatUsd(totalBankroll)} total
              {overBudget && " — this exceeds what's left"}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankroll">Group bankroll</Label>
              <Input
                id="bankroll"
                name="bankroll"
                type="number"
                step="0.01"
                min="0"
                value={bankroll || ""}
                onChange={(e) => setBankroll(Number(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk_level">Risk level</Label>
              <Select
                name="risk_level"
                value={riskLevel}
                onValueChange={(v) => setRiskLevel((v as RiskLevel) ?? "balanced")}
              >
                <SelectTrigger id="risk_level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num_parlays"># of parlays</Label>
              <Input id="num_parlays" name="num_parlays" type="number" min="1" step="1" defaultValue={5} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legs_per_parlay">Legs per parlay</Label>
              <Select name="legs_per_parlay" value={legsPerParlay} onValueChange={(v) => setLegsPerParlay(v ?? "3")}>
                <SelectTrigger id="legs_per_parlay" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEG_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} legs
                    </SelectItem>
                  ))}
                  <SelectItem value="multi">Multi (diversified)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_exposure_pct">Max player exposure (%)</Label>
            <Input
              id="max_exposure_pct"
              name="max_exposure_pct"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={50}
              required
            />
            <p className="text-xs text-muted-foreground">
              No single player will appear in more than this share of this group's parlays.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Restrict to specific players (optional)</Label>
            <p className="text-xs text-muted-foreground">
              By default this group draws from your whole Total Player Pool ({players.length}{" "}
              {players.length === 1 ? "player" : "players"}). Check players below only if you want
              this specific group limited to a subset of them.
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add players to the session pool first.</p>
              ) : (
                players.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedPlayerIds.has(p.id)}
                      onCheckedChange={() => togglePlayer(p.id)}
                    />
                    {p.name} {p.team ? `(${p.team})` : ""} &middot;{" "}
                    {p.american_odds === null
                      ? "no odds yet"
                      : p.american_odds > 0
                        ? `+${p.american_odds}`
                        : p.american_odds}
                  </label>
                ))
              )}
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
