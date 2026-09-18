"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { BreakdownRow } from "@/lib/metrics";
import { formatCurrency, formatPercent } from "@/lib/metrics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortKey = "name" | "entries" | "staked" | "winnings" | "profit" | "roi" | "winRate" | "cashRate";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Type", align: "left" },
  { key: "entries", label: "Entries", align: "right" },
  { key: "staked", label: "Staked", align: "right" },
  { key: "winnings", label: "Winnings", align: "right" },
  { key: "profit", label: "Profit", align: "right" },
  { key: "roi", label: "ROI", align: "right" },
  { key: "winRate", label: "Win %", align: "right" },
  { key: "cashRate", label: "Cash %", align: "right" },
];

export function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("staked");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const dirMultiplier = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dirMultiplier;
      const aVal = a[sortKey] ?? -Infinity;
      const bVal = b[sortKey] ?? -Infinity;
      return (aVal - bVal) * dirMultiplier;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No entries logged in this category yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <TableHead
              key={col.key}
              className={cn("cursor-pointer select-none", col.align === "right" && "text-right")}
              onClick={() => toggleSort(col.key)}
            >
              <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                {col.label}
                {sortKey === col.key ? (
                  sortDir === "asc" ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )
                ) : (
                  <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                )}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.subtypeId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right">{row.entries}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.staked)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.winnings)}</TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                row.profit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"
              )}
            >
              {formatCurrency(row.profit)}
            </TableCell>
            <TableCell className="text-right">{formatPercent(row.roi)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatPercent(row.winRate)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatPercent(row.cashRate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
