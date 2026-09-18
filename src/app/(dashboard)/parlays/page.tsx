import Link from "next/link";
import { getSessions, requireUser } from "@/lib/parlays/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionForm } from "@/components/parlays/session-form";

export default async function ParlaysPage() {
  const { supabase, user } = await requireUser();
  const sessions = await getSessions(supabase, user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TD Parlays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Standalone touchdown-scorer parlay builder — separate from DFS bankroll and rules.
          </p>
        </div>
        <SessionForm />
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No sessions yet. Create one to start building a player pool and parlay groups.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/parlays/${s.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                    {s.total_bankroll !== null && ` · $${s.total_bankroll} total bankroll`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
