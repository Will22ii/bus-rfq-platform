"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type DeparturePoint = { id: string; name: string; region: string };

type RouteRow = {
  departure_point_id: string;
  destination: string;
  arrival_time_round1: string;
  arrival_time_round2: string;
  return_departure_time: string;
  bus_type: "44_seat" | "31_seat" | "28_seat";
  required_round_trip_count: number;
  required_one_way_count: number;
};

const BUS_TYPES = [
  { value: "44_seat", label: "44인승" },
  { value: "31_seat", label: "31인승" },
  { value: "28_seat", label: "28인승" },
] as const;

export default function RfqNewPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [step, setStep] = useState(1);
  const [departurePoints, setDeparturePoints] = useState<DeparturePoint[]>([]);
  const [title, setTitle] = useState("");
  const [concertName, setConcertName] = useState("");
  const [venue, setVenue] = useState("");
  const [quoteDeadlineAt, setQuoteDeadlineAt] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate = company?.can_request ?? false;

  useEffect(() => {
    if (!canCreate) return;
    api.get<DeparturePoint[]>("/departure-points").then((r) => {
      if (r.data) setDeparturePoints(r.data);
    });
  }, [canCreate]);

  const addDate = () => {
    if (!dateInput) return;
    const d = dateInput.trim();
    if (d && !selectedDates.includes(d)) setSelectedDates((prev) => [...prev, d].sort());
    setDateInput("");
  };

  const removeDate = (d: string) => {
    setSelectedDates((prev) => prev.filter((x) => x !== d));
  };

  const addRoute = () => {
    setRoutes((prev) => [
      ...prev,
      {
        departure_point_id: departurePoints[0]?.id ?? "",
        destination: "",
        arrival_time_round1: "",
        arrival_time_round2: "",
        return_departure_time: "",
        bus_type: "44_seat",
        required_round_trip_count: 0,
        required_one_way_count: 0,
      },
    ]);
  };

  const updateRoute = (index: number, field: keyof RouteRow, value: string | number) => {
    setRoutes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRoute = (index: number) => {
    setRoutes((prev) => prev.filter((_, i) => i !== index));
  };

  const canGoStep2 =
    title.trim() &&
    concertName.trim() &&
    venue.trim() &&
    quoteDeadlineAt &&
    selectedDates.length > 0 &&
    routes.length > 0 &&
    routes.every(
      (r) =>
        r.departure_point_id &&
        r.destination.trim() &&
        r.required_round_trip_count >= 0 &&
        r.required_one_way_count >= 0
    );

  const handleCreate = async () => {
    setError("");
    setSubmitting(true);
    const deadline = new Date(quoteDeadlineAt);
    if (Number.isNaN(deadline.getTime())) {
      setError("견적 마감일을 올바르게 입력해 주세요.");
      setSubmitting(false);
      return;
    }
    const now = new Date();
    if (deadline <= now) {
      setError("견적 마감일은 미래 시점이어야 합니다.");
      setSubmitting(false);
      return;
    }
    const maxDeadline = new Date();
    maxDeadline.setDate(maxDeadline.getDate() + 5);
    if (deadline > maxDeadline) {
      setError("견적 마감일은 오늘로부터 5일 이내여야 합니다.");
      setSubmitting(false);
      return;
    }
    const payload = {
      title: title.trim(),
      concert_name: concertName.trim(),
      venue: venue.trim(),
      quote_deadline_at: deadline.toISOString(),
      dates: selectedDates.map((service_date) => ({
        service_date,
        routes: routes.map((r) => ({
          departure_point_id: r.departure_point_id,
          destination: r.destination.trim(),
          arrival_time_round1: r.arrival_time_round1 || undefined,
          arrival_time_round2: r.arrival_time_round2 || undefined,
          return_departure_time: r.return_departure_time || undefined,
          bus_type: r.bus_type,
          required_round_trip_count: r.required_round_trip_count,
          required_one_way_count: r.required_one_way_count,
        })),
      })),
    };
    const res = await api.post<{ id: string }>("/rfqs", payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data?.id) router.push(`/rfqs/${res.data.id}`);
  };

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">RFQ 생성 권한이 없습니다.</p>
        <Link href="/rfqs">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rfqs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">RFQ 생성</h1>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1단계: 기본 정보 및 운행 스케줄</CardTitle>
            <CardDescription>공연명, 출발지, 날짜, 노선을 입력하세요. 선택한 날짜에 동일한 운행 스케줄이 적용됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>공연명</Label>
                <Input value={concertName} onChange={(e) => setConcertName(e.target.value)} placeholder="공연명" />
              </div>
              <div className="space-y-2">
                <Label>RFQ 제목</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>출발지</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="출발지" />
            </div>
            <div className="space-y-2">
              <Label>견적 마감일시 (오늘부터 5일 이내)</Label>
              <Input
                type="datetime-local"
                value={quoteDeadlineAt}
                onChange={(e) => setQuoteDeadlineAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>운행 날짜 (복수 선택)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDate())}
                />
                <Button type="button" variant="outline" onClick={addDate}>
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
                      <button type="button" onClick={() => removeDate(d)} className="hover:opacity-70">
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>노선</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRoute}
                  disabled={departurePoints.length === 0}
                  title={departurePoints.length === 0 ? "출발지 데이터를 불러온 후 추가할 수 있습니다." : undefined}
                >
                  <Plus className="mr-1 size-4" />
                  노선 추가
                </Button>
              </div>
              {departurePoints.length === 0 && (
                <p className="text-sm text-muted-foreground">출발지 목록을 불러오는 중이거나 없습니다. 새로고침 후 이용해 주세요.</p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">출발지</TableHead>
                      <TableHead className="min-w-[100px]">도착지</TableHead>
                      <TableHead className="min-w-[120px]">1회차 도착</TableHead>
                      <TableHead className="min-w-[120px]">2회차 도착</TableHead>
                      <TableHead className="min-w-[120px]">귀가 출발</TableHead>
                      <TableHead className="min-w-[100px]">버스 타입</TableHead>
                      <TableHead className="min-w-[100px]">왕복 필요</TableHead>
                      <TableHead className="min-w-[100px]">편도 필요</TableHead>
                      <TableHead className="w-[50px] min-w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="min-w-[120px]">
                          <Select
                            value={r.departure_point_id || undefined}
                            onValueChange={(v) => updateRoute(i, "departure_point_id", v ?? "")}
                          >
                            <SelectTrigger className="w-[140px] min-w-[140px]">
                              <SelectValue placeholder="출발지 선택">
                                {r.departure_point_id
                                  ? (departurePoints.find((p) => p.id === r.departure_point_id)?.name ?? "출발지 선택")
                                  : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="min-w-[140px]">
                              {departurePoints.map((point) => (
                                <SelectItem key={point.id} value={point.id}>
                                  {point.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <Input
                            value={r.destination}
                            onChange={(e) => updateRoute(i, "destination", e.target.value)}
                            placeholder="도착지"
                            className="min-w-[100px] w-28"
                          />
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <Input
                            type="time"
                            value={r.arrival_time_round1}
                            onChange={(e) => updateRoute(i, "arrival_time_round1", e.target.value)}
                            className="w-32 min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <Input
                            type="time"
                            value={r.arrival_time_round2}
                            onChange={(e) => updateRoute(i, "arrival_time_round2", e.target.value)}
                            className="w-32 min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <Input
                            type="time"
                            value={r.return_departure_time}
                            onChange={(e) => updateRoute(i, "return_departure_time", e.target.value)}
                            className="w-32 min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <Select
                            value={r.bus_type}
                            onValueChange={(v) => updateRoute(i, "bus_type", (v ?? "44_seat") as RouteRow["bus_type"])}
                          >
                            <SelectTrigger className="min-w-[100px] w-28">
                              <SelectValue placeholder="버스 타입">
                                {r.bus_type
                                  ? (BUS_TYPES.find((b) => b.value === r.bus_type)?.label ?? r.bus_type)
                                  : null}
                              </SelectValue>
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
                        <TableCell className="min-w-[100px]">
                          <Input
                            type="number"
                            min={0}
                            value={r.required_round_trip_count}
                            onChange={(e) =>
                              updateRoute(i, "required_round_trip_count", parseInt(e.target.value, 10) || 0)
                            }
                            className="w-20 min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <Input
                            type="number"
                            min={0}
                            value={r.required_one_way_count}
                            onChange={(e) =>
                              updateRoute(i, "required_one_way_count", parseInt(e.target.value, 10) || 0)
                            }
                            className="w-20 min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell className="w-[50px] min-w-[50px]">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRoute(i)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canGoStep2}>
              다음: 2단계 확인
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2단계: 확인 및 생성</CardTitle>
            <CardDescription>날짜별 노선을 확인한 뒤 RFQ를 생성하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue={selectedDates[0] ?? ""}>
              <TabsList>
                {selectedDates.map((d) => (
                  <TabsTrigger key={d} value={d}>
                    {d}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedDates.map((date) => (
                <TabsContent key={date} value={date}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>노선</TableHead>
                        <TableHead>1회차 도착</TableHead>
                        <TableHead>2회차 도착</TableHead>
                        <TableHead>귀가 출발</TableHead>
                        <TableHead>버스 타입</TableHead>
                        <TableHead>왕복 필요</TableHead>
                        <TableHead>편도 필요</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {departurePoints.find((dp) => dp.id === r.departure_point_id)?.name ?? "-"} → {r.destination}
                          </TableCell>
                          <TableCell>{r.arrival_time_round1 || "-"}</TableCell>
                          <TableCell>{r.arrival_time_round2 || "-"}</TableCell>
                          <TableCell>{r.return_departure_time || "-"}</TableCell>
                          <TableCell>{BUS_TYPES.find((b) => b.value === r.bus_type)?.label ?? r.bus_type}</TableCell>
                          <TableCell>{r.required_round_trip_count}</TableCell>
                          <TableCell>{r.required_one_way_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "생성 중..." : "RFQ 생성하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
