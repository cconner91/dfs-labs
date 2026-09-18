"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importGroupsCsv, importSalaryCsv } from "@/app/(dashboard)/player-pools/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ImportButton({
  label,
  importingLabel,
  variant = "outline",
  importing,
  onSelect,
}: {
  label: string;
  importingLabel: string;
  variant?: "default" | "outline";
  importing: boolean;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button type="button" variant={variant} disabled={importing} onClick={() => inputRef.current?.click()}>
        {importing ? importingLabel : label}
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
  const router = useRouter();
  const [importingGroups, startGroupsTransition] = useTransition();
  const [importingSalary, startSalaryTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGroupsFile(file: File) {
    setError(null);
    startGroupsTransition(async () => {
      const text = await file.text();
      const result = await importGroupsCsv(weekId, file.name, text);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleSalaryFile(file: File) {
    setError(null);
    startSalaryTransition(async () => {
      const text = await file.text();
      const result = await importSalaryCsv(weekId, file.name, text);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <ImportButton
            label="Upload Groups CSV"
            importingLabel="Importing…"
            variant="default"
            importing={importingGroups}
            onSelect={handleGroupsFile}
          />
          <ImportButton
            label="Upload Salary CSV (optional)"
            importingLabel="Importing…"
            variant="outline"
            importing={importingSalary}
            onSelect={handleSalaryFile}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The Groups CSV alone is enough to build your Cash/GPP pool — it&apos;s the one that sets who&apos;s in
          each pool. The Salary CSV is optional and only adds position/team/salary on top of players already in
          a pool; you don&apos;t need it to get started.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
