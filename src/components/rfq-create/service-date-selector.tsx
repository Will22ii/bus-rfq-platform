"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

type Props = {
  selectedDates: string[];
  dateInput: string;
  onDateInputChange: (v: string) => void;
  onAddDate: () => void;
  onRemoveDate: (d: string) => void;
};

export function ServiceDateSelector({
  selectedDates,
  dateInput,
  onDateInputChange,
  onAddDate,
  onRemoveDate,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>운행 날짜 (복수 선택)</Label>
      <div className="flex gap-2">
        <Input
          type="date"
          value={dateInput}
          onChange={(e) => onDateInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddDate())}
        />
        <Button type="button" variant="outline" onClick={onAddDate}>
          추가
        </Button>
      </div>
      {selectedDates.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedDates.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
            >
              {d}
              <button
                type="button"
                onClick={() => onRemoveDate(d)}
                className="hover:opacity-70"
                aria-label={`${d} 제거`}
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
