"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContestSubtypes, requireUser } from "@/lib/data";

export interface TemplateActionState {
  error: string | null;
}

interface DkContest {
  n: string;
  a: number;
  m: number;
  mec: number;
  gameType: string;
}

interface DkLobbyResponse {
  Contests: DkContest[];
}

const DK_LOBBY_URL = "https://www.draftkings.com/lobby/getcontests?sport=NFL";

/** Most frequent distinct fees among a set of contests, capped to keep the template list usable. */
function topFees(contests: DkContest[], limit: number): number[] {
  const counts = new Map<number, number>();
  for (const c of contests) counts.set(c.a, (counts.get(c.a) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([fee]) => fee)
    .sort((a, b) => a - b);
}

export async function refreshTemplatesFromDraftKings(
  _prevState: TemplateActionState
): Promise<TemplateActionState> {
  const { supabase, user } = await requireUser();

  let contests: DkContest[];
  try {
    const res = await fetch(DK_LOBBY_URL, { cache: "no-store" });
    if (!res.ok) return { error: `DraftKings returned ${res.status}` };
    const body = (await res.json()) as DkLobbyResponse;
    contests = (body.Contests ?? []).filter((c) => c.gameType === "Classic");
  } catch {
    return { error: "Couldn't reach DraftKings — try again in a bit." };
  }
  if (contests.length === 0) {
    return { error: "DraftKings returned no contests right now — try again later." };
  }

  const subtypes = await getContestSubtypes(supabase);
  const doubleUp = subtypes.find((s) => s.category === "CASH" && s.name === "Double-Up");
  const singleEntry = subtypes.find((s) => s.category === "GPP" && s.name === "Single Entry");
  const multiEntry = subtypes.find((s) => s.category === "GPP" && s.name === "Multi-Entry");
  const satellite = subtypes.find((s) => s.category === "GPP" && s.name === "Satellite/Qualifier");
  if (!doubleUp || !singleEntry || !multiEntry || !satellite) {
    return { error: "Contest sub-types are missing — re-run supabase/migrations/0001_init.sql." };
  }

  const nameHas = (c: DkContest, ...needles: string[]) => {
    const n = c.n.toLowerCase();
    return needles.some((needle) => n.includes(needle));
  };

  const doubleUps = contests.filter((c) => nameHas(c, "double up"));
  const satellites = contests.filter((c) => nameHas(c, "satellite", "qualifier"));
  const gppLike = contests.filter(
    (c) => !nameHas(c, "double up", "satellite", "qualifier")
  );
  const gppSingle = gppLike.filter((c) => c.mec === 1);
  const gppMulti = gppLike.filter((c) => c.mec > 1 && c.mec <= 20);

  const rows: {
    user_id: string;
    contest_subtype_id: string;
    label: string;
    suggested_contest_name: string;
    entry_fee: number;
    typical_num_entries: number;
    source: "draftkings_lobby";
  }[] = [];

  for (const fee of topFees(doubleUps, 9)) {
    rows.push({
      user_id: user.id,
      contest_subtype_id: doubleUp.id,
      label: `Double-Up $${fee}`,
      suggested_contest_name: `NFL $${fee} Double Up`,
      entry_fee: fee,
      typical_num_entries: 1,
      source: "draftkings_lobby",
    });
  }
  for (const fee of topFees(gppSingle, 6)) {
    rows.push({
      user_id: user.id,
      contest_subtype_id: singleEntry.id,
      label: `Single-Entry GPP $${fee}`,
      suggested_contest_name: `NFL $${fee} Single Entry GPP`,
      entry_fee: fee,
      typical_num_entries: 1,
      source: "draftkings_lobby",
    });
  }
  for (const fee of topFees(gppMulti, 6)) {
    rows.push({
      user_id: user.id,
      contest_subtype_id: multiEntry.id,
      label: `Multi-Entry GPP $${fee}`,
      suggested_contest_name: `NFL $${fee} Multi-Entry GPP`,
      entry_fee: fee,
      typical_num_entries: 1,
      source: "draftkings_lobby",
    });
  }
  for (const fee of topFees(satellites, 4)) {
    rows.push({
      user_id: user.id,
      contest_subtype_id: satellite.id,
      label: `Satellite/Qualifier $${fee}`,
      suggested_contest_name: `NFL $${fee} Satellite`,
      entry_fee: fee,
      typical_num_entries: 1,
      source: "draftkings_lobby",
    });
  }

  const { error: deleteError } = await supabase
    .from("contest_templates")
    .delete()
    .eq("user_id", user.id)
    .eq("source", "draftkings_lobby");
  if (deleteError) return { error: deleteError.message };

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("contest_templates").insert(rows);
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/entries");
  return { error: null };
}

const manualTemplateSchema = z.object({
  contest_subtype_id: z.string().uuid("Pick a contest type"),
  label: z.string().min(1, "Give this template a name"),
  suggested_contest_name: z.string().optional(),
  entry_fee: z.coerce.number().nonnegative().optional(),
  typical_num_entries: z.coerce.number().int().positive().default(1),
});

export async function addManualTemplate(
  _prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const parsed = manualTemplateSchema.safeParse({
    contest_subtype_id: formData.get("contest_subtype_id"),
    label: formData.get("label"),
    suggested_contest_name: formData.get("suggested_contest_name") || undefined,
    entry_fee: formData.get("entry_fee") || undefined,
    typical_num_entries: formData.get("typical_num_entries") || 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("contest_templates").insert({
    user_id: user.id,
    contest_subtype_id: parsed.data.contest_subtype_id,
    label: parsed.data.label,
    suggested_contest_name: parsed.data.suggested_contest_name ?? null,
    entry_fee: parsed.data.entry_fee ?? null,
    typical_num_entries: parsed.data.typical_num_entries,
    source: "manual",
  });
  if (error) return { error: error.message };

  revalidatePath("/entries");
  return { error: null };
}

export async function deleteTemplate(templateId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("contest_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/entries");
}
