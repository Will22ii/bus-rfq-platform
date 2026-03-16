"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  title: string;
  venue: string;
  quoteDeadlineAt: string;
  deadlineError?: string;
  onTitleChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onQuoteDeadlineAtChange: (v: string) => void;
};

export function RFQBasicInfo({
  title,
  venue,
  quoteDeadlineAt,
  deadlineError,
  onTitleChange,
  onVenueChange,
  onQuoteDeadlineAtChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>RFQ 제목</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="제목"
        />
      </div>
      <div className="space-y-2">
        <Label>행사장 (도착지)</Label>
        <Input
          value={venue}
          onChange={(e) => onVenueChange(e.target.value)}
          placeholder="행사장"
        />
      </div>
      <div className="space-y-2">
        <Label>견적 마감일시 (오늘부터 5일 이내)</Label>
        <Input
          type="datetime-local"
          value={quoteDeadlineAt}
          onChange={(e) => onQuoteDeadlineAtChange(e.target.value)}
        />
        {deadlineError && (
          <p className="text-sm text-destructive" role="alert">
            {deadlineError}
          </p>
        )}
      </div>
    </div>
  );
}
