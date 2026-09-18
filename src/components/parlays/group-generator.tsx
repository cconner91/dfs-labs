"use client";

import { useState, useTransition } from "react";
import { deleteGroup, saveGeneratedParlays, toggleParlayEntered } from "@/app/(dashboard)/parlays/actions";
import { generateParlaysForGroup } from "@/lib/parlays/engine";
import type { GeneratedParlay, SavedParlay, TdParlayGroup, TdParlayPlayer } from "@/lib/parlays/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}
function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function ParlayCard({
  parlay,
  index,
  sessionId,
}: {
  parlay: GeneratedParlay | SavedParlay;
  index: number;
  sessionId: string;
}) {
  const isSaved = "id" in parlay;
  const stake = "stake" in parlay ? parlay.stake : 0;
  const multiplier = "payoutMultiplier" in parlay ? parlay.payoutMultiplier : parlay.payout_multiplier;
  const probability = "combinedProbability" in parlay ? parlay.combinedProbability : parlay.combined_probability;
  const potentialPayout = "potentialPayout" in parlay ? parlay.potentialPayout : stake * multiplier;
  const entered = isSaved && parlay.is_entered;

  const [pending, startTransition] = useTransition();
  function handleToggleEntered() {
    if (!isSaved) return;
    startTransition(async () => {
      await toggleParlayEntered(parlay.id, sessionId, !parlay.is_entered);
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 text-sm",
        entered && "border-primary/40 bg-primary/5 ring-1 ring-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-medium">Parlay {index + 1}</p>
          {entered && (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Entered</Badge>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary">{formatCurrency(potentialPayout)}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(stake)} stake</p>
        </div>
      </div>

      <div className="my-3 border-t" />

      <div className="flex flex-wrap gap-1.5">
        {parlay.legs.map((leg) => (
          <Badge key={leg.player_id} variant="secondary">
            {leg.name} {formatOdds(leg.american_odds)}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{(probability * 100).toFixed(1)}% implied</span>
        <span className="tabular-nums">{multiplier.toFixed(2)}x payout</span>
      </div>

      {isSaved && (
        <Button
          size="xs"
          variant={entered ? "default" : "outline"}
          className="mt-3 w-full"
          disabled={pending}
          onClick={handleToggleEntered}
        >
          {entered ? "Entered ✓" : "Mark entered"}
        </Button>
      )}
    </div>
  );
}

export function GroupGenerator({
  sessionId,
  group,
  pool,
  savedParlays,
}: {
  sessionId: string;
  group: TdParlayGroup;
  pool: TdParlayPlayer[];
  savedParlays: SavedParlay[];
}) {
  const [generated, setGenerated] = useState<GeneratedParlay[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleGenerate() {
    const result = generateParlaysForGroup(pool, {
      numParlays: group.num_parlays,
      legsPerParlay: group.legs_per_parlay,
      riskLevel: group.risk_level,
      bankroll: group.bankroll,
      maxExposurePct: group.max_exposure_pct,
    });
    setGenerated(result.parlays);
    setWarnings(result.warnings);
    setSaveError(null);
  }

  async function handleSave() {
    if (!generated) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveGeneratedParlays(group.id, sessionId, generated);
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setGenerated(null);
    }
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteGroup(group.id, sessionId);
        setDeleteOpen(false);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Couldn't delete this group.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{group.label}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {group.num_parlays} parlays &middot; {group.legs_per_parlay === null ? "Multi" : `${group.legs_per_parlay} legs`}{" "}
            &middot; {group.risk_level} &middot; max {group.max_exposure_pct ?? 50}% exposure &middot;{" "}
            {formatCurrency(group.bankroll)} bankroll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate}>{savedParlays.length > 0 ? "Regenerate" : "Generate"}</Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground">Delete</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete group?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes “{group.label}” and any parlays saved under it. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((w, i) => (
          <p key={i} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-500">
            {w}
          </p>
        ))}

        {generated && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                This generation &middot; {formatCurrency(generated.reduce((sum, p) => sum + p.stake, 0))} total wagered
              </p>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save this set"}
              </Button>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="space-y-2">
              {generated.map((p, i) => (
                <ParlayCard key={i} parlay={p} index={i} sessionId={sessionId} />
              ))}
            </div>
          </div>
        )}

        {savedParlays.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saved &middot; {formatCurrency(savedParlays.reduce((sum, p) => sum + p.stake, 0))} total wagered
            </p>
            <div className="space-y-2">
              {savedParlays.map((p, i) => (
                <ParlayCard key={p.id} parlay={p} index={i} sessionId={sessionId} />
              ))}
            </div>
          </div>
        )}

        {!generated && savedParlays.length === 0 && (
          <p className="text-sm text-muted-foreground">Click &quot;Generate&quot; to build parlays for this group.</p>
        )}
      </CardContent>
    </Card>
  );
}
