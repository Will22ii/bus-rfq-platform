"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  open: { label: "견적 접수중", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  in_review: { label: "심사 진행중", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  completed: { label: "선택 완료", className: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" },
  cancelled: { label: "요청 취소", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
