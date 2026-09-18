import { getCurrentWeek, getPlayerPoolEntries, requireUser } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { PoolImportControls } from "@/components/player-pools/pool-import-controls";
import { PlayerPoolTabs } from "@/components/player-pools/player-pool-tabs";

export default async function PlayerPoolsPage() {
  const { supabase, user } = await requireUser();
  const currentWeek = await getCurrentWeek(supabase);

  if (!currentWeek) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No week set up yet — add a week under Weeks before importing a player pool.
        </CardContent>
      </Card>
    );
  }

  const entries = await getPlayerPoolEntries(supabase, user.id, currentWeek.id);
  const cash = entries.filter((e) => e.pool_type === "CASH");
  const gpp = entries.filter((e) => e.pool_type === "GPP");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Player Pools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Week {currentWeek.week_number} &middot; imported from your DraftKings groups/salary exports.
        </p>
      </div>

      <PoolImportControls weekId={currentWeek.id} />

      <PlayerPoolTabs cash={cash} gpp={gpp} />
    </div>
  );
}
