"use client";

import { useState } from "react";
import { deleteGroup, saveGeneratedParlays } from "@/app/(dashboard)/parlays/actions";
import { generateParlaysForGroup } from "@/lib/parlays/engine";
import type { GeneratedParlay, SavedParlay, TdParlayGroup, TdParlayPlayer } from "@/lib/parlays/types";
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

function ParlayCard({ parlay, index }: { parlay: GeneratedParlay | SavedParlay; index: number }) {
  const stake = "stake" in parlay ? parlay.stake : 0;
  const multiplier = "payoutMultiplier" in parlay ? parlay.payoutMultiplier : parlay.payout_multiplier;
  const probability = "combinedProbability" in parlay ? parlay.combinedProbability : parlay.combined_probability;
  const potentialPayout = "potentialPayout" in parlay ? parlay.potentialPayout : stake * multiplier;

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium">Parlay {index + 1}</p>
        <p className="text-muted-foreground">
          {formatCurrency(stake)} to win {formatCurrency(potentialPayout)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {parlay.legs.map((leg) => (
          <Badge key={leg.player_id} variant="secondary">
            {leg.name} {formatOdds(leg.american_odds)}
          </Badge>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {(probability * 100).toFixed(1)}% implied &middot; {multiplier.toFixed(2)}x payout
      </p>
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
          <Button onClick={handleGenerate}>Generate</Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground">Delete</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete group?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes “{group.label}” and any parlays saved under it. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteGroup.bind(null, group.id, sessionId)}>
                  <AlertDialogAction type="submit" variant="destructive">
                    Delete
                  </AlertDialogAction>
                </form>
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
                This generation
              </p>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save this set"}
              </Button>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="space-y-2">
              {generated.map((p, i) => (
                <ParlayCard key={i} parlay={p} index={i} />
              ))}
            </div>
          </div>
        )}

        {savedParlays.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved</p>
            <div className="space-y-2">
              {savedParlays.map((p, i) => (
                <ParlayCard key={p.id} parlay={p} index={i} />
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
