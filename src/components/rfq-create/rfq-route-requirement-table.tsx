"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeparturePoint } from "./route-selector";

const BUS_TYPES = [
  { value: "44_seat", label: "44인승" },
  { value: "31_seat", label: "31인승" },
  { value: "28_seat", label: "28인승" },
] as const;

function busTypeToLabel(value: string): string {
  return BUS_TYPES.find((b) => b.value === value)?.label ?? value;
}

export type RouteRequirement = {
  bus_type: "44_seat" | "31_seat" | "28_seat";
  required_round_trip_count: number;
  required_one_way_count: number;
};

export type ScheduleTimes = {
  arrivalTimeRound1: string;
  arrivalTimeRound2: string;
  arrivalTimeRound3?: string;
  returnDepartureTime: string;
};

type Props = {
  roundCount: 1 | 2 | 3;
  departurePointIds: string[];
  departurePoints: DeparturePoint[];
  scheduleTimes: ScheduleTimes;
  requirements: Record<string, RouteRequirement>;
  onRequirementChange: (
    departurePointId: string,
    field: keyof RouteRequirement,
    value: string | number
  ) => void;
};

function defaultRequirement(): RouteRequirement {
  return {
    bus_type: "44_seat",
    required_round_trip_count: 0,
    required_one_way_count: 0,
  };
}

const ROUND_LABELS = ["1회차 도착", "2회차 도착", "3회차 도착"] as const;
const ROUND_KEYS: (keyof ScheduleTimes)[] = ["arrivalTimeRound1", "arrivalTimeRound2", "arrivalTimeRound3"];

export function RFQRouteRequirementTable({
  roundCount,
  departurePointIds,
  departurePoints,
  scheduleTimes,
  requirements,
  onRequirementChange,
}: Props) {
  const getName = (id: string) => departurePoints.find((p) => p.id === id)?.name ?? id;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[140px]">노선</TableHead>
          {Array.from({ length: roundCount }, (_, i) => (
            <TableHead key={i} className="min-w-[100px]">
              {ROUND_LABELS[i]}
            </TableHead>
          ))}
          <TableHead className="min-w-[100px]">귀가 출발</TableHead>
          <TableHead className="min-w-[100px]">버스 타입</TableHead>
          <TableHead className="min-w-[80px]">왕복 필요 대수</TableHead>
          <TableHead className="min-w-[80px]">편도 필요 대수</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {departurePointIds.map((depId) => {
          const req = requirements[depId] ?? defaultRequirement();
          return (
            <TableRow key={depId}>
              <TableCell className="font-medium">{getName(depId)}</TableCell>
              {Array.from({ length: roundCount }, (_, i) => (
                <TableCell key={i} className="text-muted-foreground">
                  {(scheduleTimes[ROUND_KEYS[i] as keyof ScheduleTimes] as string) || "-"}
                </TableCell>
              ))}
              <TableCell className="text-muted-foreground">
                {scheduleTimes.returnDepartureTime || "-"}
              </TableCell>
              <TableCell>
                <Select
                  value={req.bus_type}
                  onValueChange={(v) =>
                    onRequirementChange(depId, "bus_type", (v ?? "44_seat") as RouteRequirement["bus_type"])
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <span className="truncate">{busTypeToLabel(req.bus_type)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {BUS_TYPES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={req.required_round_trip_count}
                  onChange={(e) =>
                    onRequirementChange(
                      depId,
                      "required_round_trip_count",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={req.required_one_way_count}
                  onChange={(e) =>
                    onRequirementChange(
                      depId,
                      "required_one_way_count",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
