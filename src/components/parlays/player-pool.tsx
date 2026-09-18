"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addPlayer,
  deletePlayer,
  updatePlayerOdds,
  type ActionState,
} from "@/app/(dashboard)/parlays/actions";
import { americanOddsToImpliedProbability, bucketForPlayer } from "@/lib/parlays/engine";
import type { TdParlayPlayer } from "@/lib/parlays/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BucketBadge } from "@/components/parlays/bucket-badge";

const initialState: ActionState = { error: null };

function OddsCell({ player, sessionId }: { player: TdParlayPlayer; sessionId: string }) {
  const [value, setValue] = useState(player.american_odds !== null ? String(player.american_odds) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n === 0 || n === player.american_odds) return;
    setSaving(true);
    await updatePlayerOdds(player.id, sessionId, n);
    setSaving(false);
  }

  return (
    <Input
      type="number"
      value={value}
      placeholder="+150"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      disabled={saving}
      className="h-8 w-24"
    />
  );
}

export function PlayerPool({ sessionId, players }: { sessionId: string; players: TdParlayPlayer[] }) {
  const [state, formAction, pending] = useActionState(addPlayer, initialState);
  const [showManual, setShowManual] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current && !pending && state.error === null) {
      formRef.current?.reset();
      hasSubmitted.current = false;
    }
  }, [pending, state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Total Player Pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No players yet — add some from the browser below. Adding a player saves it
            immediately, so there's nothing else to save here.
          </p>
        ) : (
          <>
          <p className="text-xs text-muted-foreground">
            Every player below is already saved. Once you're happy with the pool, scroll down to
            create a Group and generate parlays.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Game Time</TableHead>
                <TableHead className="text-right">O/U</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead className="text-right">Implied %</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p) => {
                const bucket = bucketForPlayer(p.american_odds, p.over_under);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        {[p.position, p.team].filter(Boolean).join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.opponent ? `${p.is_home ? "vs" : "@"} ${p.opponent}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.game_time
                        ? new Date(p.game_time).toLocaleString("en-US", {
                            weekday: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.over_under ?? "—"}</TableCell>
                    <TableCell>
                      <OddsCell player={p} sessionId={sessionId} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.american_odds !== null
                        ? `${(americanOddsToImpliedProbability(p.american_odds) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <BucketBadge bucket={bucket} />
                    </TableCell>
                    <TableCell>
                      <form action={deletePlayer.bind(null, p.id, sessionId)}>
                        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                          Remove
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </>
        )}

        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowManual((v) => !v)}>
            {showManual ? "Hide manual add" : "Add manually instead"}
          </Button>
          {showManual && (
            <form
              ref={formRef}
              action={(formData) => {
                hasSubmitted.current = true;
                formAction(formData);
              }}
              className="mt-2 grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2"
            >
              <input type="hidden" name="session_id" value={sessionId} />
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">
                  Player
                </Label>
                <Input id="name" name="name" placeholder="e.g. Ja'Marr Chase" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team" className="text-xs">
                  Team (optional)
                </Label>
                <Input id="team" name="team" placeholder="CIN" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="american_odds" className="text-xs">
                  Odds
                </Label>
                <Input id="american_odds" name="american_odds" type="number" placeholder="+150" required />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add"}
              </Button>
            </form>
          )}
          {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
