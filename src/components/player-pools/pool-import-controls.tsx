"use client";

import { useRef, useState, useTransition } from "react";
import { importGroupsCsv, importSalaryCsv } from "@/app/(dashboard)/player-pools/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ImportButton({
  label,
  importing,
  onSelect,
}: {
  label: string;
  importing: boolean;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button type="button" variant="outline" disabled={importing} onClick={() => inputRef.current?.click()}>
        {importing ? "Importing…" : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onSelect(file);
        }}
      />
    </>
  );
}

export function PoolImportControls({ weekId }: { weekId: string }) {
  const [importingGroups, startGroupsTransition] = useTransition();
  const [importingSalary, startSalaryTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGroupsFile(file: File) {
    setError(null);
    startGroupsTransition(async () => {
      const text = await file.text();
      const result = await importGroupsCsv(weekId, file.name, text);
      if (result.error) setError(result.error);
    });
  }

  function handleSalaryFile(file: File) {
    setError(null);
    startSalaryTransition(async () => {
      const text = await file.text();
      const result = await importSalaryCsv(weekId, file.name, text);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <ImportButton label="Upload Groups CSV" importing={importingGroups} onSelect={handleGroupsFile} />
        <ImportButton label="Upload Salary CSV" importing={importingSalary} onSelect={handleSalaryFile} />
        <p className="text-xs text-muted-foreground">
          Groups CSV sets who&apos;s in Cash/GPP this week (replaces the existing pool). Salary CSV fills in
          position/team/salary for whoever&apos;s already in a pool.
        </p>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
