import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, type WeekSpend } from "@/lib/metrics";
import type { Rules } from "@/lib/types";

const ROWS: { key: keyof Rules; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "GPP", label: "GPP" },
  { key: "CASH", label: "Cash" },
  { key: "CASH_H2H", label: "H2H" },
];

export function WeekVsRulesCard({
  weekLabel,
  spend,
  bankrollBalance,
  rules,
  largeFieldGppCount,
  largeFieldGppCap,
}: {
  weekLabel: string;
  spend: WeekSpend;
  bankrollBalance: number;
  rules: Rules;
  largeFieldGppCount?: number;
  largeFieldGppCap?: number | null;
}) {
  const configured = ROWS.filter((r) => rules[r.key] !== null);
  const showLimit = largeFieldGppCap !== undefined && largeFieldGppCap !== null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {weekLabel} vs. your rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {configured.length === 0 && !showLimit ? (
          <p className="text-sm text-muted-foreground">
            No allocation rules set.{" "}
            <Link href="/goals" className="underline underline-offset-4">
              Set weekly caps
            </Link>{" "}
            to see compliance here.
          </p>
        ) : (
          <>
            {configured.map(({ key, label }) => {
              const spent = spend[key];
              const pct = bankrollBalance > 0 ? spent / bankrollBalance : null;
              const capPct = rules[key]! / 100;
              const over = pct !== null && pct > capPct;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={over ? "text-destructive font-medium" : ""}>
                    {formatCurrency(spent)} &middot; {formatPercent(pct)} of {formatPercent(capPct)} cap
                  </span>
                </div>
              );
            })}
            {showLimit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Large-field GPPs</span>
                <span
                  className={
                    (largeFieldGppCount ?? 0) > largeFieldGppCap! ? "text-destructive font-medium" : ""
                  }
                >
                  {largeFieldGppCount ?? 0} of {largeFieldGppCap} max
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
