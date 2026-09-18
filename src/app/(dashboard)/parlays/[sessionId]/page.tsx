import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getGroupPlayerIds,
  getGroups,
  getPlayers,
  getSavedParlays,
  getSession,
  requireUser,
} from "@/lib/parlays/data";
import { getWeeklyPlayerPool } from "@/lib/parlays/nfl-data";
import { PlayerPool } from "@/components/parlays/player-pool";
import { PlayerBrowser } from "@/components/parlays/player-browser";
import { GroupForm } from "@/components/parlays/group-form";
import { GroupGenerator } from "@/components/parlays/group-generator";
import { DeleteSessionButton } from "@/components/parlays/delete-session-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default async function ParlaySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { supabase, user } = await requireUser();

  const session = await getSession(supabase, sessionId);
  if (!session || session.user_id !== user.id) notFound();

  const [players, groups] = await Promise.all([
    getPlayers(supabase, sessionId),
    getGroups(supabase, sessionId),
  ]);

  let weeklyPlayers: Awaited<ReturnType<typeof getWeeklyPlayerPool>> = [];
  let weeklyPlayersError: string | null = null;
  try {
    weeklyPlayers = await getWeeklyPlayerPool();
  } catch {
    weeklyPlayersError = "Couldn't reach ESPN's schedule/roster feed right now — add players manually below.";
  }
  const existingKeys = new Set(players.map((p) => `${p.name.toLowerCase()}|${(p.team ?? "").toLowerCase()}`));
  const browsablePlayers = weeklyPlayers.filter(
    (p) => !existingKeys.has(`${p.name.toLowerCase()}|${p.team.toLowerCase()}`)
  );

  const groupsWithData = await Promise.all(
    groups.map(async (group) => {
      const [playerIds, savedParlays] = await Promise.all([
        getGroupPlayerIds(supabase, group.id),
        getSavedParlays(supabase, group.id),
      ]);
      const pool = playerIds.length > 0 ? players.filter((p) => playerIds.includes(p.id)) : players;
      return { group, pool, savedParlays };
    })
  );

  const allocated = groups.reduce((sum, g) => sum + g.bankroll, 0);
  const remaining = session.total_bankroll !== null ? session.total_bankroll - allocated : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/parlays" className="text-xs text-muted-foreground underline underline-offset-4">
            &larr; All sessions
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{session.label}</h1>
        </div>
        <DeleteSessionButton sessionId={session.id} label={session.label} />
      </div>

      <PlayerPool sessionId={sessionId} players={players} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This week&apos;s matchups</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyPlayersError ? (
            <p className="text-sm text-muted-foreground">{weeklyPlayersError}</p>
          ) : (
            <PlayerBrowser sessionId={sessionId} players={browsablePlayers} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Groups</h2>
            {session.total_bankroll !== null && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Math.max(remaining ?? 0, 0))} remaining of {formatCurrency(session.total_bankroll)}{" "}
                total bankroll
              </p>
            )}
          </div>
          <GroupForm
            sessionId={sessionId}
            players={players}
            totalBankroll={session.total_bankroll}
            remaining={remaining}
          />
        </div>

        {groupsWithData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups yet. Add players to the pool, then create a group to generate parlays.
          </p>
        ) : (
          <div className="space-y-4">
            {groupsWithData.map(({ group, pool, savedParlays }) => (
              <GroupGenerator
                key={group.id}
                sessionId={sessionId}
                group={group}
                pool={pool}
                savedParlays={savedParlays}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
