"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatforms, requireUser } from "@/lib/data";

const entrySchema = z.object({
  week_id: z.string().uuid("Pick a week"),
  contest_subtype_id: z.string().uuid("Pick a contest type"),
  contest_name: z.string().min(1, "Contest name is required"),
  entry_fee: z.coerce.number().nonnegative("Entry fee can't be negative"),
  num_entries: z.coerce.number().int().positive("Must enter at least 1 lineup"),
  entered_at: z.string().min(1),
  winnings: z.coerce.number().nonnegative("Winnings can't be negative").default(0),
  notes: z.string().optional(),
  save_as_template: z.boolean(),
  slate_type: z.enum(["classic", "showdown"]).default("classic"),
});

export interface EntryActionState {
  error: string | null;
}

export async function addEntry(
  _prevState: EntryActionState,
  formData: FormData
): Promise<EntryActionState> {
  const parsed = entrySchema.safeParse({
    week_id: formData.get("week_id"),
    contest_subtype_id: formData.get("contest_subtype_id"),
    contest_name: formData.get("contest_name"),
    entry_fee: formData.get("entry_fee"),
    num_entries: formData.get("num_entries"),
    entered_at: formData.get("entered_at"),
    winnings: formData.get("winnings") || 0,
    notes: formData.get("notes") || undefined,
    save_as_template: formData.get("save_as_template") === "on",
    slate_type: formData.get("slate_type") || "classic",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const platforms = await getPlatforms(supabase);
  const draftKings = platforms.find((p) => p.name === "DraftKings") ?? platforms[0];
  if (!draftKings) return { error: "No platforms seeded — run supabase/migrations/0001_init.sql" };

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    week_id: parsed.data.week_id,
    platform_id: draftKings.id,
    contest_subtype_id: parsed.data.contest_subtype_id,
    contest_name: parsed.data.contest_name,
    entry_fee: parsed.data.entry_fee,
    num_entries: parsed.data.num_entries,
    entered_at: new Date(parsed.data.entered_at).toISOString(),
    winnings: parsed.data.winnings,
    notes: parsed.data.notes ?? null,
    slate_type: parsed.data.slate_type,
  });

  if (error) return { error: error.message };

  if (parsed.data.save_as_template) {
    await supabase.from("contest_templates").insert({
      user_id: user.id,
      contest_subtype_id: parsed.data.contest_subtype_id,
      label: `${parsed.data.contest_name} ($${parsed.data.entry_fee})`,
      suggested_contest_name: parsed.data.contest_name,
      entry_fee: parsed.data.entry_fee,
      typical_num_entries: parsed.data.num_entries,
      source: "manual",
    });
    // Best-effort — a failed template save shouldn't fail the entry that already saved successfully.
  }

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteEntry(entryId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("entries").delete().eq("id", entryId).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/entries");
  revalidatePath("/dashboard");
}
