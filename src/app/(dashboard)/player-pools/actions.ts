"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { getPlatforms, requireUser } from "@/lib/data";
import type { PoolType } from "@/lib/types";

export interface ImportActionState {
  error: string | null;
}

async function logImport(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  filename: string,
  rowCount: number
) {
  const platforms = await getPlatforms(supabase);
  const draftKings = platforms.find((p) => p.name === "DraftKings") ?? platforms[0];
  if (!draftKings) return;
  await supabase
    .from("csv_imports")
    .insert({ user_id: userId, platform_id: draftKings.id, filename, row_count: rowCount });
}

function poolTypeFromGroupName(groupName: string): PoolType | null {
  const lower = groupName.toLowerCase();
  if (lower.includes("cash")) return "CASH";
  if (lower.includes("gpp")) return "GPP";
  return null;
}

interface GroupsCsvRow {
  GroupName?: string;
  Id?: string;
  Name?: string;
}

/** DraftKings "Groups" export — defines which players are in the Cash Pool / GPP Pool this week. */
export async function importGroupsCsv(
  weekId: string,
  filename: string,
  csvText: string
): Promise<ImportActionState> {
  const { supabase, user } = await requireUser();

  const parsed = Papa.parse<GroupsCsvRow>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { error: `Couldn't read that CSV: ${parsed.errors[0].message}` };
  }

  const byPool = new Map<PoolType, { dk_player_id: string; name: string }[]>();
  for (const row of parsed.data) {
    if (!row.GroupName || !row.Id || !row.Name) continue;
    const poolType = poolTypeFromGroupName(row.GroupName);
    if (!poolType) continue;
    if (!byPool.has(poolType)) byPool.set(poolType, []);
    byPool.get(poolType)!.push({ dk_player_id: row.Id, name: row.Name });
  }

  if (byPool.size === 0) {
    return { error: "No Cash Pool or GPP Pool rows found in that file — check the GroupName column." };
  }

  let totalRows = 0;
  for (const [poolType, players] of byPool) {
    const { error: deleteError } = await supabase
      .from("player_pool_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("week_id", weekId)
      .eq("pool_type", poolType);
    if (deleteError) return { error: deleteError.message };

    const { error: insertError } = await supabase.from("player_pool_entries").insert(
      players.map((p) => ({
        user_id: user.id,
        week_id: weekId,
        pool_type: poolType,
        dk_player_id: p.dk_player_id,
        name: p.name,
      }))
    );
    if (insertError) return { error: insertError.message };
    totalRows += players.length;
  }

  await logImport(supabase, user.id, filename, totalRows);
  revalidatePath("/player-pools");
  return { error: null };
}

interface SalaryCsvRow {
  [key: string]: string | undefined;
}

function findColumn(headers: string[], names: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const name of names) {
    const idx = lower.indexOf(name);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/** DraftKings salary export — merged into whatever's already in the pool by DK player Id. */
export async function importSalaryCsv(
  weekId: string,
  filename: string,
  csvText: string
): Promise<ImportActionState> {
  const { supabase, user } = await requireUser();

  const parsed = Papa.parse<SalaryCsvRow>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { error: `Couldn't read that CSV: ${parsed.errors[0].message}` };
  }
  if (parsed.data.length === 0 || !parsed.meta.fields) {
    return { error: "That file doesn't look like a DraftKings salary export." };
  }

  const headers = parsed.meta.fields;
  const idCol = findColumn(headers, ["id"]);
  const positionCol = findColumn(headers, ["position"]);
  const salaryCol = findColumn(headers, ["salary"]);
  const teamCol = findColumn(headers, ["teamabbrev", "team"]);

  if (!idCol || !salaryCol) {
    return { error: "Couldn't find ID/Salary columns in that file — is this a DraftKings salary export?" };
  }

  let matched = 0;
  for (const row of parsed.data) {
    const dkPlayerId = row[idCol];
    if (!dkPlayerId) continue;

    const salaryRaw = salaryCol ? row[salaryCol] : undefined;
    const salary = salaryRaw ? Number(salaryRaw.replace(/[^0-9.]/g, "")) : null;

    const { data, error } = await supabase
      .from("player_pool_entries")
      .update({
        position: positionCol ? (row[positionCol] ?? null) : null,
        team: teamCol ? (row[teamCol] ?? null) : null,
        salary: salary && !Number.isNaN(salary) ? salary : null,
      })
      .eq("user_id", user.id)
      .eq("week_id", weekId)
      .eq("dk_player_id", dkPlayerId)
      .select("id");
    if (error) return { error: error.message };
    matched += data?.length ?? 0;
  }

  await logImport(supabase, user.id, filename, matched);
  revalidatePath("/player-pools");
  return { error: null };
}

export async function removePoolEntry(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("player_pool_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/player-pools");
}
