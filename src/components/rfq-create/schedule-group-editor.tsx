"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type Schedule = {
  id: string;
  assignedDates: string[];
  roundCount: 1 | 2 | 3;
  arrivalTimeRound1: string;
  arrivalTimeRound2: string;
  arrivalTimeRound3: string;
  returnDepartureTime: string;
};

type Props = {
  schedules: Schedule[];
  serviceDates: string[];
  onSchedulesChange: (schedules: Schedule[]) => void;
};

function emptySchedule(id: string): Schedule {
  return {
    id,
    assignedDates: [],
    roundCount: 2,
    arrivalTimeRound1: "",
    arrivalTimeRound2: "",
    arrivalTimeRound3: "",
    returnDepartureTime: "",
  };
}

export function ScheduleGroupEditor({
  schedules,
  serviceDates,
  onSchedulesChange,
}: Props) {
  const addSchedule = () => {
    const id = `schedule-${Date.now()}`;
    onSchedulesChange([...schedules, emptySchedule(id)]);
  };

  const removeSchedule = (id: string) => {
    onSchedulesChange(schedules.filter((s) => s.id !== id));
  };

  const updateSchedule = (id: string, upd: Partial<Schedule>) => {
    onSchedulesChange(
      schedules.map((s) => (s.id === id ? { ...s, ...upd } : s))
    );
  };

  const toggleDateForSchedule = (scheduleId: string, date: string) => {
    const s = schedules.find((x) => x.id === scheduleId);
    if (!s) return;
    const has = s.assignedDates.includes(date);
    const newDates = has
      ? s.assignedDates.filter((d) => d !== date)
      : [...s.assignedDates, date].sort();
    updateSchedule(scheduleId, { assignedDates: newDates });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>스케줄 (날짜별 도착·귀가 시간)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
          <Plus className="mr-1 size-4" />
          스케줄 추가
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        각 스케줄에 운행 날짜를 배정하고, 1~3회차 도착 시간과 귀가 출발 시간을 입력하세요. 같은 스케줄을 여러 날짜에 적용할 수 있습니다.
      </p>
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">스케줄</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSchedule(schedule.id)}
                aria-label="스케줄 삭제"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">이 스케줄을 적용할 날짜</Label>
              <div className="flex flex-wrap gap-2">
                {serviceDates.map((d) => {
                  const checked = schedule.assignedDates.includes(d);
                  return (
                    <label
                      key={d}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDateForSchedule(schedule.id, d)}
                        className="size-4"
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
              {serviceDates.length === 0 && (
                <p className="text-sm text-muted-foreground">먼저 운행 날짜를 추가하세요.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">회차 수</Label>
              <Select
                value={String(schedule.roundCount)}
                onValueChange={(v) =>
                  updateSchedule(schedule.id, {
                    roundCount: Number(v) as 1 | 2 | 3,
                  })
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1회차</SelectItem>
                  <SelectItem value="2">2회차</SelectItem>
                  <SelectItem value="3">3회차</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">1회차 도착</Label>
                <Input
                  type="time"
                  value={schedule.arrivalTimeRound1}
                  onChange={(e) =>
                    updateSchedule(schedule.id, {
                      arrivalTimeRound1: e.target.value,
                    })
                  }
                />
              </div>
              {schedule.roundCount >= 2 && (
                <div className="space-y-1">
                  <Label className="text-xs">2회차 도착</Label>
                  <Input
                    type="time"
                    value={schedule.arrivalTimeRound2}
                    onChange={(e) =>
                      updateSchedule(schedule.id, {
                        arrivalTimeRound2: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              {schedule.roundCount >= 3 && (
                <div className="space-y-1">
                  <Label className="text-xs">3회차 도착</Label>
                  <Input
                    type="time"
                    value={schedule.arrivalTimeRound3}
                    onChange={(e) =>
                      updateSchedule(schedule.id, {
                        arrivalTimeRound3: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">귀가 출발</Label>
                <Input
                  type="time"
                  value={schedule.returnDepartureTime}
                  onChange={(e) =>
                    updateSchedule(schedule.id, {
                      returnDepartureTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
