"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addEntry, type EntryActionState } from "@/app/(dashboard)/entries/actions";
import type { ContestCategory, ContestSubtype, ContestTemplate, Rules, SlateType, Week } from "@/lib/types";
import { formatCurrency, formatPercent, type WeekSpend } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: EntryActionState = { error: null };
const EMPTY_SPEND: WeekSpend = { overall: 0, GPP: 0, CASH: 0, CASH_H2H: 0 };

function toneFor(pct: number | null, capPct: number | null): string {
  if (pct === null || capPct === null) return "text-muted-foreground";
  if (pct > capPct) return "text-destructive";
  if (pct > capPct * 0.8) return "text-amber-600 dark:text-amber-500";
  return "text-muted-foreground";
}

export function EntryForm({
  weeks,
  contestSubtypes,
  templates,
  defaultWeekId,
  bankrollBalance,
  rules,
  weekSpend,
  largeFieldGppCount,
  largeFieldGppCap,
}: {
  weeks: Week[];
  contestSubtypes: ContestSubtype[];
  templates: ContestTemplate[];
  defaultWeekId: string | null;
  bankrollBalance: number;
  rules: Rules;
  weekSpend: Map<string, WeekSpend>;
  largeFieldGppCount: Map<string, number>;
  largeFieldGppCap: number | null;
}) {
  const [state, formAction, pending] = useActionState(addEntry, initialState);
  const [open, setOpen] = useState(false);
  const [entryFee, setEntryFee] = useState(0);
  const [numEntries, setNumEntries] = useState(1);
  const [weekId, setWeekId] = useState(defaultWeekId ?? "");
  const [subtypeId, setSubtypeId] = useState("");
  const [contestName, setContestName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [slateType, setSlateType] = useState<SlateType>("classic");
  const hasSubmitted = useRef(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (hasSubmitted.current && !pending && state.error === null) {
      setOpen(false);
      hasSubmitted.current = false;
      setEntryFee(0);
      setNumEntries(1);
      setContestName("");
      setTemplateId("");
      setSlateType("classic");
    }
  }, [pending, state]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSubtypeId(template.contest_subtype_id);
    if (template.entry_fee !== null) setEntryFee(template.entry_fee);
    setNumEntries(template.typical_num_entries);
    setContestName(template.suggested_contest_name ?? "");
  }

  const gpp = contestSubtypes.filter((c) => c.category === "GPP");
  const cash = contestSubtypes.filter((c) => c.category === "CASH");
  const selectedSubtype = contestSubtypes.find((c) => c.id === subtypeId);
  const category: ContestCategory | null = selectedSubtype?.category ?? null;

  const newCost = entryFee * numEntries;
  const existingSpend = weekSpend.get(weekId) ?? EMPTY_SPEND;
  const overallProjected = existingSpend.overall + newCost;
  const overallPct = bankrollBalance > 0 ? overallProjected / bankrollBalance : null;
  const overallCapPct = rules.overall !== null ? rules.overall / 100 : null;

  const categoryProjected = category ? existingSpend[category] + newCost : null;
  const categoryPct =
    category && bankrollBalance > 0 && categoryProjected !== null ? categoryProjected / bankrollBalance : null;
  const categoryCapPct = category ? (rules[category] !== null ? rules[category]! / 100 : null) : null;

  const isH2H = selectedSubtype?.category === "CASH" && selectedSubtype.name === "Head-to-Head";
  const h2hProjected = isH2H ? existingSpend.CASH_H2H + newCost : null;
  const h2hPct = isH2H && bankrollBalance > 0 && h2hProjected !== null ? h2hProjected / bankrollBalance : null;
  const h2hCapPct = rules.CASH_H2H !== null ? rules.CASH_H2H / 100 : null;

  const isLargeFieldGpp = selectedSubtype?.category === "GPP" && selectedSubtype.name === "Large Field";
  const largeFieldCountSoFar = largeFieldGppCount.get(weekId) ?? 0;
  const largeFieldProjectedCount = isLargeFieldGpp ? largeFieldCountSoFar + 1 : largeFieldCountSoFar;
  const largeFieldOverCap =
    isLargeFieldGpp && largeFieldGppCap !== null && largeFieldProjectedCount > largeFieldGppCap;

  const showdownCashConflict = slateType === "showdown" && category === "CASH";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) hasSubmitted.current = false;
      }}
    >
      <DialogTrigger render={<Button>Add entry</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add contest entry</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
          className="space-y-4"
        >
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template_id">Start from a template (optional)</Label>
              <Select value={templateId} onValueChange={(v) => applyTemplate(v ?? "")}>
                <SelectTrigger id="template_id" className="w-full">
                  <SelectValue placeholder="None — fill in manually" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="week_id">Week</Label>
              <Select name="week_id" value={weekId} onValueChange={(v) => setWeekId(v ?? "")}>
                <SelectTrigger id="week_id" className="w-full">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Week {w.week_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contest_subtype_id">Contest type</Label>
              <Select name="contest_subtype_id" value={subtypeId} onValueChange={(v) => setSubtypeId(v ?? "")}>
                <SelectTrigger id="contest_subtype_id" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>GPP</SelectLabel>
                    {gpp.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Cash</SelectLabel>
                    {cash.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slate_type">Slate</Label>
            <Select
              name="slate_type"
              value={slateType}
              onValueChange={(v) => setSlateType((v as SlateType) ?? "classic")}
            >
              <SelectTrigger id="slate_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic (multi-game)</SelectItem>
                <SelectItem value="showdown">Showdown (single game — Thu/SNF/MNF)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contest_name">Contest name</Label>
            <Input
              id="contest_name"
              name="contest_name"
              placeholder="e.g. NFL Sunday Million"
              value={contestName}
              onChange={(e) => setContestName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry fee</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_entries"># of entries</Label>
              <Input
                id="num_entries"
                name="num_entries"
                type="number"
                min="1"
                step="1"
                value={numEntries}
                onChange={(e) => setNumEntries(Number(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          {bankrollBalance > 0 && weekId && (
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <p className={toneFor(overallPct, overallCapPct)}>
                {formatCurrency(overallProjected)} this week overall ({formatPercent(overallPct)} of bankroll
                {overallCapPct !== null ? `, cap ${formatPercent(overallCapPct)}` : ""})
              </p>
              {category && (
                <p className={toneFor(categoryPct, categoryCapPct)}>
                  {formatCurrency(categoryProjected ?? 0)} this week in {category} ({formatPercent(categoryPct)} of
                  bankroll
                  {categoryCapPct !== null ? `, cap ${formatPercent(categoryCapPct)}` : ""})
                </p>
              )}
              {isH2H && (
                <p className={toneFor(h2hPct, h2hCapPct)}>
                  {formatCurrency(h2hProjected ?? 0)} this week in H2H ({formatPercent(h2hPct)} of bankroll
                  {h2hCapPct !== null ? `, cap ${formatPercent(h2hCapPct)}` : ""})
                </p>
              )}
              {isLargeFieldGpp && (
                <p className={largeFieldOverCap ? "text-destructive" : "text-muted-foreground"}>
                  {largeFieldProjectedCount} large-field GPP{largeFieldProjectedCount === 1 ? "" : "s"} this week
                  {largeFieldGppCap !== null ? ` (cap ${largeFieldGppCap})` : ""}
                </p>
              )}
            </div>
          )}

          {showdownCashConflict && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Your rule: no cash entries on showdown slates. This is a Cash entry on a Showdown slate.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entered_at">Date</Label>
              <Input id="entered_at" name="entered_at" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="winnings">Winnings (if settled)</Label>
              <Input id="winnings" name="winnings" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Stack/exposure notes for this entry" rows={2} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="save_as_template" />
            Save this contest setup as a template for next time
          </label>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
