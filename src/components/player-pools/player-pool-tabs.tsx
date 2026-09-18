"use client";

import { useTransition } from "react";
import { removePoolEntry } from "@/app/(dashboard)/player-pools/actions";
import { formatCurrency } from "@/lib/metrics";
import type { PlayerPoolEntry, Position } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const POSITION_ORDER: Position[] = ["QB", "RB", "WR", "TE", "DST"];

function positionSortKey(position: Position | null): number {
  if (position === null) return POSITION_ORDER.length;
  const idx = POSITION_ORDER.indexOf(position);
  return idx === -1 ? POSITION_ORDER.length : idx;
}

function RemoveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() => startTransition(() => removePoolEntry(id))}
    >
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

function PoolTable({ players }: { players: PlayerPoolEntry[] }) {
  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No players yet — upload a Groups CSV above to populate this pool.
      </p>
    );
  }

  const sorted = [...players].sort((a, b) => {
    const posDiff = positionSortKey(a.position) - positionSortKey(b.position);
    if (posDiff !== 0) return posDiff;
    return (b.salary ?? 0) - (a.salary ?? 0);
  });
  const totalSalary = players.reduce((sum, p) => sum + (p.salary ?? 0), 0);
  const hasSalary = players.some((p) => p.salary !== null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {players.length} player{players.length === 1 ? "" : "s"}
        {hasSalary && ` · ${formatCurrency(totalSalary)} total salary`}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pos</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Salary</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-muted-foreground">{p.position ?? "—"}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.team ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {p.salary !== null ? formatCurrency(p.salary) : "—"}
              </TableCell>
              <TableCell>
                <RemoveButton id={p.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PlayerPoolTabs({ cash, gpp }: { cash: PlayerPoolEntry[]; gpp: PlayerPoolEntry[] }) {
  return (
    <Tabs defaultValue="CASH">
      <TabsList>
        <TabsTrigger value="CASH">Cash ({cash.length})</TabsTrigger>
        <TabsTrigger value="GPP">GPP ({gpp.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="CASH">
        <Card>
          <CardContent className="pt-4">
            <PoolTable players={cash} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="GPP">
        <Card>
          <CardContent className="pt-4">
            <PoolTable players={gpp} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
