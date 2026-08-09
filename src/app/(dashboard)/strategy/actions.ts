"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data";

const lineupSchema = z.object({
  week_id: z.string().uuid("Pick a week"),
  label: z.string().min(1, "Give this plan a short label"),
  strategy_notes: z.string().optional(),
  stack_notes: z.string().optional(),
});

export interface LineupActionState {
  error: string | null;
}

export async function addLineup(
  _prevState: LineupActionState,
  formData: FormData
): Promise<LineupActionState> {
  const parsed = lineupSchema.safeParse({
    week_id: formData.get("week_id"),
    label: formData.get("label"),
    strategy_notes: formData.get("strategy_notes") || undefined,
    stack_notes: formData.get("stack_notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("lineups").insert({
    user_id: user.id,
    week_id: parsed.data.week_id,
    label: parsed.data.label,
    strategy_notes: parsed.data.strategy_notes ?? null,
    stack_notes: parsed.data.stack_notes ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/strategy");
  return { error: null };
}
