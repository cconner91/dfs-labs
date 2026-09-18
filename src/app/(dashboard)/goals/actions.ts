"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data";

export interface RulesActionState {
  error: string | null;
}

const ruleSchema = z.object({
  overall: z.coerce.number().positive().max(100).optional(),
  GPP: z.coerce.number().positive().max(100).optional(),
  CASH: z.coerce.number().positive().max(100).optional(),
  CASH_H2H: z.coerce.number().positive().max(100).optional(),
});

/** Upserts all four rule rows (Overall/GPP/Cash/Cash H2H) in one submit. A blank field clears that rule. */
export async function saveRules(
  _prevState: RulesActionState,
  formData: FormData
): Promise<RulesActionState> {
  const raw = {
    overall: formData.get("overall") || undefined,
    GPP: formData.get("GPP") || undefined,
    CASH: formData.get("CASH") || undefined,
    CASH_H2H: formData.get("CASH_H2H") || undefined,
  };
  const parsed = ruleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const rows: { category: "OVERALL" | "GPP" | "CASH" | "CASH_H2H"; value: number | undefined }[] = [
    { category: "OVERALL", value: parsed.data.overall },
    { category: "GPP", value: parsed.data.GPP },
    { category: "CASH", value: parsed.data.CASH },
    { category: "CASH_H2H", value: parsed.data.CASH_H2H },
  ];

  for (const row of rows) {
    if (row.value === undefined) {
      const { error } = await supabase
        .from("allocation_rules")
        .delete()
        .eq("user_id", user.id)
        .eq("category", row.category);
      if (error) return { error: error.message };
      continue;
    }
    const { error } = await supabase
      .from("allocation_rules")
      .upsert(
        { user_id: user.id, category: row.category, max_pct: row.value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,category" }
      );
    if (error) return { error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { error: null };
}

export interface GoalActionState {
  error: string | null;
}

const goalSchema = z.object({
  period_type: z.enum(["season", "month", "week"]),
  period_ref: z.string().min(1, "Pick a period"),
  metric: z.enum(["bankroll_growth", "roi_target"]),
  target_value: z.coerce.number().refine((n) => n !== 0, "Target can't be zero"),
});

export async function addGoal(
  _prevState: GoalActionState,
  formData: FormData
): Promise<GoalActionState> {
  const parsed = goalSchema.safeParse({
    period_type: formData.get("period_type"),
    period_ref: formData.get("period_ref"),
    metric: formData.get("metric"),
    target_value: formData.get("target_value"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    period_type: parsed.data.period_type,
    period_ref: parsed.data.period_ref,
    metric: parsed.data.metric,
    target_value: parsed.data.target_value,
  });
  if (error) return { error: error.message };

  revalidatePath("/goals");
  return { error: null };
}

export async function deleteGoal(goalId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/goals");
}

export interface LimitsActionState {
  error: string | null;
}

const limitsSchema = z.object({
  large_field_gpp_count: z.coerce.number().int().positive().max(100).optional(),
});

/** Upserts the large-field-GPP weekly count cap. A blank field clears it. */
export async function saveLimits(
  _prevState: LimitsActionState,
  formData: FormData
): Promise<LimitsActionState> {
  const parsed = limitsSchema.safeParse({
    large_field_gpp_count: formData.get("large_field_gpp_count") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  if (parsed.data.large_field_gpp_count === undefined) {
    const { error } = await supabase
      .from("weekly_contest_limits")
      .delete()
      .eq("user_id", user.id)
      .eq("metric", "large_field_gpp_count");
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("weekly_contest_limits").upsert(
      {
        user_id: user.id,
        metric: "large_field_gpp_count",
        max_count: parsed.data.large_field_gpp_count,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,metric" }
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { error: null };
}
