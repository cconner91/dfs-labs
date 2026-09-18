"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/metrics";

export interface WeeklyProfitPoint {
  weekLabel: string;
  profit: number;
}

export function WeeklyProfitChart({ data }: { data: WeeklyProfitPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No entries yet — log a contest entry to see weekly profit/loss.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
          {data.map((point, i) => (
            <Cell
              key={i}
              fill={point.profit >= 0 ? "var(--color-primary)" : "var(--color-destructive)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
