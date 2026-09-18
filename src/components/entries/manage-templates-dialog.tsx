"use client";

import { useActionState, useState } from "react";
import {
  addManualTemplate,
  deleteTemplate,
  refreshTemplatesFromDraftKings,
  type TemplateActionState,
} from "@/app/(dashboard)/entries/templates-actions";
import type { ContestSubtype, ContestTemplate } from "@/lib/types";
import { formatCurrency } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const initialState: TemplateActionState = { error: null };

export function ManageTemplatesDialog({
  templates,
  contestSubtypes,
}: {
  templates: ContestTemplate[];
  contestSubtypes: ContestSubtype[];
}) {
  const [open, setOpen] = useState(false);
  const [refreshState, refreshAction, refreshing] = useActionState(
    refreshTemplatesFromDraftKings,
    initialState
  );
  const [addState, addAction, adding] = useActionState(addManualTemplate, initialState);

  const subtypeById = new Map(contestSubtypes.map((s) => [s.id, s]));
  const gpp = templates.filter((t) => subtypeById.get(t.contest_subtype_id)?.category === "GPP");
  const cash = templates.filter((t) => subtypeById.get(t.contest_subtype_id)?.category === "CASH");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Manage templates</Button>} />
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contest templates</DialogTitle>
        </DialogHeader>

        <form action={refreshAction} className="space-y-2">
          <Button type="submit" variant="outline" size="sm" disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh from DraftKings"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Pulls current fee tiers for Double-Up, Single/Multi-Entry GPP, and Satellite/Qualifier from
            DraftKings' public contest lobby. Doesn't touch templates you added yourself.
          </p>
          {refreshState.error && <p className="text-sm text-destructive">{refreshState.error}</p>}
        </form>

        <Separator />

        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates yet — refresh from DraftKings, or check "Save as template" next time you add
              an entry.
            </p>
          ) : (
            <>
              <TemplateGroup title="GPP" templates={gpp} />
              <TemplateGroup title="Cash" templates={cash} />
            </>
          )}
        </div>

        <Separator />

        <form action={addAction} className="space-y-3">
          <p className="text-sm font-medium">Add a template manually</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tpl_label" className="text-xs">
                Label
              </Label>
              <Input id="tpl_label" name="label" placeholder="e.g. My usual $5 GPP" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl_subtype" className="text-xs">
                Contest type
              </Label>
              <Select name="contest_subtype_id">
                <SelectTrigger id="tpl_subtype" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>GPP</SelectLabel>
                    {contestSubtypes
                      .filter((s) => s.category === "GPP")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Cash</SelectLabel>
                    {contestSubtypes
                      .filter((s) => s.category === "CASH")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl_fee" className="text-xs">
                Entry fee (optional)
              </Label>
              <Input id="tpl_fee" name="entry_fee" type="number" step="0.01" min="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl_name" className="text-xs">
                Suggested contest name (optional)
              </Label>
              <Input id="tpl_name" name="suggested_contest_name" />
            </div>
          </div>
          {addState.error && <p className="text-sm text-destructive">{addState.error}</p>}
          <Button type="submit" size="sm" disabled={adding}>
            {adding ? "Adding…" : "Add template"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateGroup({ title, templates }: { title: string; templates: ContestTemplate[] }) {
  if (templates.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">
                {t.entry_fee !== null ? formatCurrency(t.entry_fee) : "No fee set"}
                {t.source === "manual" && (
                  <Badge variant="secondary" className="ml-2">
                    manual
                  </Badge>
                )}
              </p>
            </div>
            <form action={deleteTemplate.bind(null, t.id)}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Delete
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
