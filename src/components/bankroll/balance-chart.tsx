"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BankrollTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/metrics";

export function BalanceChart({ transactions }: { transactions: BankrollTransaction[] }) {
  const data = transactions.reduce<{ date: string; balance: number }[]>((acc, t) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const delta = t.type === "withdrawal" ? -t.amount : t.amount;
    acc.push({
      date: new Date(t.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      balance: Math.round((previousBalance + delta) * 100) / 100,
    });
    return acc;
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No transactions yet — add a deposit to start tracking your bankroll.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={70}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#balanceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
