import type { ContrarianBucket } from "@/lib/parlays/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<ContrarianBucket, string> = {
  chalk: "Chalk",
  moderate: "Moderate",
  contrarian: "Contrarian",
  unranked: "Unranked",
};

const BUCKET_BADGE_CLASS: Record<ContrarianBucket, string> = {
  chalk: "border-primary/40 bg-primary/10 text-primary",
  moderate: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  contrarian: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  unranked: "",
};

export function BucketBadge({ bucket, className }: { bucket: ContrarianBucket; className?: string }) {
  return (
    <Badge variant="outline" className={cn(BUCKET_BADGE_CLASS[bucket], className)}>
      {BUCKET_LABEL[bucket]}
    </Badge>
  );
}
