"use client";

import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DeparturePoint = { id: string; name: string; region: string };

type Props = {
  departurePoints: DeparturePoint[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

const REGION_LABEL: Record<string, string> = {
  metro: "수도권",
  local: "지방",
};

export function RouteSelector({
  departurePoints,
  selectedIds,
  onSelectedIdsChange,
}: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id].sort());
    }
  };

  const metro = departurePoints.filter((p) => p.region === "metro");
  const local = departurePoints.filter((p) => p.region === "local");

  return (
    <div className="space-y-2">
      <Label>노선 (출발지 선택) — 도착지는 행사장으로 동일합니다</Label>
      <Tabs defaultValue="metro" className="w-full">
        <TabsList>
          <TabsTrigger value="metro">{REGION_LABEL.metro ?? "수도권"}</TabsTrigger>
          <TabsTrigger value="local">{REGION_LABEL.local ?? "지방"}</TabsTrigger>
        </TabsList>
        <TabsContent value="metro" className="pt-2">
          <div className="flex flex-wrap gap-2">
            {metro.length === 0 ? (
              <p className="text-sm text-muted-foreground">수도권 출발지가 없습니다.</p>
            ) : (
              metro.map((p) => (
                <label
                  key={p.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-4"
                  />
                  {p.name}
                </label>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="local" className="pt-2">
          <div className="flex flex-wrap gap-2">
            {local.length === 0 ? (
              <p className="text-sm text-muted-foreground">지방 출발지가 없습니다.</p>
            ) : (
              local.map((p) => (
                <label
                  key={p.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-4"
                  />
                  {p.name}
                </label>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      {departurePoints.length === 0 && (
        <p className="text-sm text-muted-foreground">출발지 목록을 불러오는 중이거나 없습니다.</p>
      )}
    </div>
  );
}
