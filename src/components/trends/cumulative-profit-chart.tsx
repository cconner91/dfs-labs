"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/metrics";

export interface CumulativeProfitPoint {
  weekLabel: string;
  cumulativeProfit: number;
}

export function CumulativeProfitChart({ data }: { data: CumulativeProfitPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No entries yet — log a contest entry to see cumulative performance.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cumulativeProfitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
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
          dataKey="cumulativeProfit"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#cumulativeProfitFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
