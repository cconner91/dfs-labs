"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateDefaultAccount, requireUser } from "@/lib/data";

const transactionSchema = z
  .object({
    type: z.enum(["deposit", "withdrawal", "adjustment"]),
    amount: z.coerce.number().refine((n) => n !== 0, "Amount can't be zero"),
    occurred_at: z.string().min(1),
    note: z.string().optional(),
  })
  .refine((data) => data.type === "adjustment" || data.amount > 0, {
    message: "Amount must be greater than 0",
    path: ["amount"],
  });

export interface TransactionActionState {
  error: string | null;
}

export async function addTransaction(
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    occurred_at: formData.get("occurred_at"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const account = await getOrCreateDefaultAccount(supabase, user.id);

  const { error } = await supabase.from("bankroll_transactions").insert({
    user_id: user.id,
    account_id: account.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    occurred_at: new Date(parsed.data.occurred_at).toISOString(),
    note: parsed.data.note ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/bankroll");
  revalidatePath("/dashboard");
  return { error: null };
}
