"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { addPlayerFromRoster, refreshOdds } from "@/app/(dashboard)/parlays/actions";
import { bucketForPlayer } from "@/lib/parlays/engine";
import type { ContrarianBucket, SkillPosition, WeeklyPlayerRow } from "@/lib/parlays/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BucketBadge } from "@/components/parlays/bucket-badge";
import { cn } from "@/lib/utils";

type SortKey = "name" | "team" | "opponent" | "game_time" | "over_under" | "american_odds";
type PositionFilter = "ALL" | SkillPosition;
type BucketFilter = "ALL" | ContrarianBucket;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Player" },
  { key: "american_odds", label: "Anytime TD Odds" },
  { key: "team", label: "Team" },
  { key: "opponent", label: "Opponent" },
  { key: "game_time", label: "Game Time" },
  { key: "over_under", label: "O/U" },
];

export function PlayerBrowser({ sessionId, players }: { sessionId: string; players: WeeklyPlayerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PositionFilter>("ALL");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("ALL");
  // Default: most-favored (most negative) anytime-TD odds first.
  const [sortKey, setSortKey] = useState<SortKey>("american_odds");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshOdds() {
    setRefreshing(true);
    await refreshOdds(sessionId);
    router.refresh();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players.filter((p) => {
      if (position !== "ALL" && p.position !== position) return false;
      if (bucketFilter !== "ALL" && bucketForPlayer(p.american_odds, p.over_under) !== bucketFilter) return false;
      if (term && !p.name.toLowerCase().includes(term) && !p.team.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [players, search, position, bucketFilter]);

  const sorted = useMemo(() => {
    const dirMultiplier = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "string") return aVal.localeCompare(bVal as string) * dirMultiplier;
      return ((aVal as number) - (bVal as number)) * dirMultiplier;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleAdd(player: WeeklyPlayerRow) {
    setAddingId(player.espn_id);
    setAddError(null);
    const result = await addPlayerFromRoster(sessionId, player);
    setAddingId(null);
    if (result.error) {
      setAddError(`Couldn't add ${player.name}: ${result.error}`);
    } else {
      setAddedIds((prev) => new Set(prev).add(player.espn_id));
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search player or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={position} onValueChange={(v) => setPosition((v as PositionFilter) ?? "ALL")}>
          <TabsList>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
            <TabsTrigger value="QB">QB</TabsTrigger>
            <TabsTrigger value="RB">RB</TabsTrigger>
            <TabsTrigger value="WR">WR</TabsTrigger>
            <TabsTrigger value="TE">TE</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={bucketFilter} onValueChange={(v) => setBucketFilter((v as BucketFilter) ?? "ALL")}>
          <TabsList>
            <TabsTrigger value="ALL">All buckets</TabsTrigger>
            <TabsTrigger value="chalk">Chalk</TabsTrigger>
            <TabsTrigger value="moderate">Moderate</TabsTrigger>
            <TabsTrigger value="contrarian">Contrarian</TabsTrigger>
            <TabsTrigger value="unranked">Unranked</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button type="button" variant="outline" size="sm" onClick={handleRefreshOdds} disabled={refreshing}>
          {refreshing ? "Refreshing odds…" : "Refresh odds"}
        </Button>
      </div>

      {addError && <p className="text-sm text-destructive">{addError}</p>}

      <div className="max-h-96 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className="sticky top-0 z-10 cursor-pointer select-none bg-card"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                    )}
                  </span>
                </TableHead>
              ))}
              <TableHead className="sticky top-0 z-10 bg-card">Bucket</TableHead>
              <TableHead className="sticky top-0 right-0 z-20 bg-card" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => {
              const bucket = bucketForPlayer(p.american_odds, p.over_under);
              const isAdded = addedIds.has(p.espn_id);
              return (
                <TableRow key={p.espn_id}>
                  <TableCell className="font-medium">
                    {p.name} <span className="text-xs text-muted-foreground">{p.position}</span>
                  </TableCell>
                  <TableCell>
                    {p.american_odds === null
                      ? "—"
                      : p.american_odds > 0
                        ? `+${p.american_odds}`
                        : p.american_odds}
                  </TableCell>
                  <TableCell>{p.team}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.is_home ? "vs" : "@"} {p.opponent}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.game_time).toLocaleString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.over_under ?? "—"}</TableCell>
                  <TableCell>
                    <BucketBadge bucket={bucket} />
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 bg-card">
                    <Button
                      size="sm"
                      variant={isAdded ? "secondary" : "default"}
                      disabled={isAdded || addingId === p.espn_id}
                      onClick={() => handleAdd(p)}
                    >
                      {isAdded ? "Added" : addingId === p.espn_id ? "Adding…" : "Add"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className={cn("p-6 text-center text-sm text-muted-foreground")}>
                  No players match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
