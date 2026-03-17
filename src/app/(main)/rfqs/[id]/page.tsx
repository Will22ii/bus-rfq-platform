"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

type DeparturePoint = { id: string; name: string; region: string };
type RfqRoute = {
  id: string;
  rfq_date_id: string;
  departure_point_id: string;
  destination: string;
  arrival_time_round1: string | null;
  arrival_time_round2: string | null;
  return_departure_time: string | null;
  bus_type: string;
  required_round_trip_count: number;
  required_one_way_count: number;
  sort_order: number;
  departure_points: DeparturePoint | null;
};
type RfqDate = { id: string; rfq_id: string; service_date: string; sort_order: number };
type SupplyRow = { rfq_route_id: string; supplier_submission_id?: string; supply_round_trip_count: number; supply_one_way_count: number; vehicle_year: number | null };
type PriceRow = { rfq_route_id: string; supplier_submission_id?: string; round_trip_price: number | null; one_way_price: number | null };
type Submission = {
  id: string;
  rfq_id: string;
  supplier_company_id: string;
  submitted_at: string;
  company_name?: string;
  public_phone?: string;
  supplier_label?: string;
};

const BUS_LABEL: Record<string, string> = { "44_seat": "44인승", "31_seat": "31인승", "28_seat": "28인승" };

/** 노선 기준 키 (날짜 무관). 동일 출발지·도착지는 모든 날짜에서 같은 가격으로 취급 */
function routeKey(r: { departure_point_id: string; destination: string }) {
  return `${r.departure_point_id}|${r.destination}`;
}

type RegionFilter = "all" | "metro" | "local";
function filterRoutesByRegion(routes: RfqRoute[], region: RegionFilter): RfqRoute[] {
  if (region === "all") return routes;
  return routes.filter((r) => r.departure_points?.region === region);
}

function buildPricesByRouteKey(
  routes: RfqRoute[],
  priceRows: PriceRow[]
): Record<string, { round_trip_price: number | null; one_way_price: number | null }> {
  const routeMap = new Map(routes.map((r) => [r.id, r]));
  const out: Record<string, { round_trip_price: number | null; one_way_price: number | null }> = {};
  for (const row of priceRows ?? []) {
    const route = routeMap.get(row.rfq_route_id);
    if (route) {
      const key = routeKey(route);
      out[key] = { round_trip_price: row.round_trip_price ?? null, one_way_price: row.one_way_price ?? null };
    }
  }
  return out;
}

export default function RfqDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useAuth();
  const [rfq, setRfq] = useState<Record<string, unknown> | null>(null);
  const [rfqDates, setRfqDates] = useState<RfqDate[]>([]);
  const [rfqRoutes, setRfqRoutes] = useState<RfqRoute[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [supply, setSupply] = useState<SupplyRow[]>([]);
  /** 가격은 노선 기준(날짜 무관). 동일 출발지·도착지면 모든 날짜 탭에서 같은 값 표시 */
  const [pricesByRouteKey, setPricesByRouteKey] = useState<Record<string, { round_trip_price: number | null; one_way_price: number | null }>>({});
  /** 요청자용: API에서 받은 공급사별 노선 가격 (참여 공급사 견적 테이블 표시용) */
  const [routePricesFromApi, setRoutePricesFromApi] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");

  const isRequester = rfq && company && (rfq.requester_company_id as string) === company.id;
  const mySubmission = !isRequester ? submissions[0] : undefined;
  const canSubmit =
    !isRequester &&
    !!company?.can_supply &&
    !!rfq &&
    (rfq.status as string) === "open" &&
    !mySubmission;

  useEffect(() => {
    if (!id) return;
    api.get<{
      rfq_dates: RfqDate[];
      rfq_routes: RfqRoute[];
      rfq_supplier_submissions: Submission[];
      rfq_supplier_route_supply: SupplyRow[];
      rfq_supplier_route_prices: PriceRow[];
    }>(`/rfqs/${id}`).then((res) => {
      if (res.error) setError(res.error);
      else if (res.data) {
        const d = res.data as unknown as {
          id: string;
          requester_company_id: string;
          status: string;
          title: string;
          concert_name: string;
          venue: string;
          quote_deadline_at: string;
          rfq_dates: RfqDate[];
          rfq_routes: RfqRoute[];
          rfq_supplier_submissions: Submission[];
          rfq_supplier_route_supply: SupplyRow[];
          rfq_supplier_route_prices: PriceRow[];
        };
        setRfq(d);
        setRfqDates(d.rfq_dates ?? []);
        setRfqRoutes(d.rfq_routes ?? []);
        setSubmissions(d.rfq_supplier_submissions ?? []);
        setSupply(d.rfq_supplier_route_supply ?? []);
        setPricesByRouteKey(buildPricesByRouteKey(d.rfq_routes ?? [], d.rfq_supplier_route_prices ?? []));
        setRoutePricesFromApi(d.rfq_supplier_route_prices ?? []);
      }
      setLoading(false);
    });
  }, [id]);

  const routesByDate = rfqDates.map((d) => ({
    date: d,
    routes: rfqRoutes.filter((r) => r.rfq_date_id === d.id),
  }));

  const setSupplyForRoute = (routeId: string, field: keyof SupplyRow, value: number | null) => {
    setSupply((prev) => {
      const i = prev.findIndex((s) => s.rfq_route_id === routeId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], [field]: value ?? 0 };
        return next;
      }
      return [...prev, { rfq_route_id: routeId, supply_round_trip_count: 0, supply_one_way_count: 0, vehicle_year: null, [field]: value } as SupplyRow];
    });
  };

  const setPriceForRouteKey = (key: string, field: "round_trip_price" | "one_way_price", value: number | null) => {
    setPricesByRouteKey((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { round_trip_price: null, one_way_price: null }), [field]: value },
    }));
  };

  const getSupply = (routeId: string) => supply.find((s) => s.rfq_route_id === routeId) ?? { supply_round_trip_count: 0, supply_one_way_count: 0, vehicle_year: null };
  const getPriceByRouteKey = (key: string) => pricesByRouteKey[key] ?? { round_trip_price: null, one_way_price: null };

  const hasAnySupply = rfqRoutes.some((r) => {
    const s = getSupply(r.id);
    return s.supply_round_trip_count + s.supply_one_way_count >= 1;
  });

  const handleSubmit = async () => {
    setError("");
    const supplyRows = rfqRoutes.map((r) => {
      const s = getSupply(r.id);
      return {
        route_id: r.id,
        supply_round_trip_count: s.supply_round_trip_count,
        supply_one_way_count: s.supply_one_way_count,
        vehicle_year: undefined as number | undefined,
      };
    });
    // 부분 공급: 해당 공급이 0이면 해당 가격 null, 1 이상이면 가격 전송
    const priceRows = rfqRoutes.map((r, i) => {
      const sr = supplyRows[i];
      const p = getPriceByRouteKey(routeKey(r));
      return {
        route_id: r.id,
        round_trip_price: sr.supply_round_trip_count >= 1 ? p.round_trip_price : null,
        one_way_price: sr.supply_one_way_count >= 1 ? p.one_way_price : null,
      };
    });
    const anySupply = supplyRows.some(
      (s) => s.supply_round_trip_count + s.supply_one_way_count >= 1
    );
    if (!anySupply) {
      setError("최소 한 노선 이상에 공급 대수를 입력해야 합니다.");
      return;
    }
    // 부분 공급: 왕복 공급 있으면 왕복 가격 필수, 편도 공급 있으면 편도 가격 필수
    const priceInvalidIdx = supplyRows.findIndex((s, i) => {
      const p = priceRows[i];
      if (s.supply_round_trip_count >= 1 && (p.round_trip_price == null || p.round_trip_price < 0)) return true;
      if (s.supply_one_way_count >= 1 && (p.one_way_price == null || p.one_way_price < 0)) return true;
      return false;
    });
    if (priceInvalidIdx >= 0) {
      setError("공급이 있는 항목에는 해당 가격을 입력해 주세요. (왕복 공급 시 왕복 가격, 편도 공급 시 편도 가격)");
      return;
    }
    setSubmitting(true);
    const res = await api.post<{ id: string }>(`/rfqs/${id}/submit`, {
      route_supplies: supplyRows,
      route_prices: priceRows,
    });
    setSubmitting(false);
    if (res.error) setError(res.error);
    else window.location.reload();
  };

  if (loading) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (error && !rfq) return <p className="text-destructive">{error}</p>;
  if (!rfq) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rfqs">
            <Button variant="ghost" size="sm">목록</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{(rfq.title as string) ?? ""}</h1>
            <p className="text-muted-foreground">{(rfq.venue as string) ?? ""}</p>
          </div>
          <StatusBadge status={(rfq.status as string) ?? "open"} />
        </div>
        {isRequester && (rfq.status === "open" || rfq.status === "in_review") && (
          <Button
            variant="destructive"
            disabled={cancelLoading}
            onClick={() => setCancelModalOpen(true)}
          >
            RFQ 취소
          </Button>
        )}
      </div>

      <Tabs defaultValue={rfqDates[0]?.id ?? ""}>
        <TabsList>
          {rfqDates.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>
              {d.service_date}
            </TabsTrigger>
          ))}
        </TabsList>
        {routesByDate.map(({ date, routes }) => {
          const isSupplier = canSubmit || !!mySubmission;
          const displayedRoutes = isSupplier ? filterRoutesByRegion(routes, regionFilter) : routes;
          return (
          <TabsContent key={date.id} value={date.id} className="space-y-4">
            {isSupplier && (
              <Tabs value={regionFilter} onValueChange={(v) => setRegionFilter(v as RegionFilter)}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="metro">수도권</TabsTrigger>
                  <TabsTrigger value="local">지방</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Card>
              <CardHeader>
                <CardTitle>노선 테이블</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pl-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pr-4">노선</TableHead>
                      <TableHead className="pr-4">1회차 도착</TableHead>
                      <TableHead className="pr-4">2회차 도착</TableHead>
                      <TableHead className="pr-4">귀가 출발</TableHead>
                      <TableHead className="pr-4">버스 타입</TableHead>
                      <TableHead className="pr-4">왕복 필요 대수</TableHead>
                      <TableHead className="border-r-2 border-border pr-4 shadow-[2px_0_0_0_hsl(var(--border))]">편도 필요 대수</TableHead>
                      {canSubmit && (
                        <>
                          <TableHead className="pl-5 pr-4">왕복 공급 대수</TableHead>
                          <TableHead className="pr-4">편도 공급 대수</TableHead>
                        </>
                      )}
                      {mySubmission && !canSubmit && (
                        <>
                          <TableHead className="pl-5 pr-4">왕복 공급 대수</TableHead>
                          <TableHead className="pr-4">편도 공급 대수</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRoutes.map((r) => {
                      const s = getSupply(r.id);
                      const roundOptions = Array.from({ length: r.required_round_trip_count + 1 }, (_, i) => ({ value: String(i), label: i === 0 ? "배차불가" : `${i}` }));
                      const oneWayOptions = Array.from({ length: r.required_one_way_count + 1 }, (_, i) => ({ value: String(i), label: i === 0 ? "배차불가" : `${i}` }));
                      const roundDisabled = r.required_round_trip_count === 0;
                      const oneWayDisabled = r.required_one_way_count === 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="pr-4">
                            {r.departure_points?.name ?? "-"}
                          </TableCell>
                          <TableCell className="pr-4">{r.arrival_time_round1 ?? "-"}</TableCell>
                          <TableCell className="pr-4">{r.arrival_time_round2 ?? "-"}</TableCell>
                          <TableCell className="pr-4">{r.return_departure_time ?? "-"}</TableCell>
                          <TableCell className="pr-4">{BUS_LABEL[r.bus_type] ?? r.bus_type}</TableCell>
                          <TableCell className="pr-4">{r.required_round_trip_count}</TableCell>
                          <TableCell className="border-r-2 border-border pr-4 shadow-[2px_0_0_0_hsl(var(--border))]">{r.required_one_way_count}</TableCell>
                          {canSubmit && (
                            <>
                              <TableCell className="pl-5">
                                <Select
                                  value={String(s.supply_round_trip_count)}
                                  onValueChange={(v) => {
                                    const n = parseInt(v ?? "", 10) ?? 0;
                                    setSupplyForRoute(r.id, "supply_round_trip_count", n);
                                    if (n === 0) setPriceForRouteKey(routeKey(r), "round_trip_price", null);
                                  }}
                                  disabled={roundDisabled}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roundOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="pr-4">
                                <Select
                                  value={String(s.supply_one_way_count)}
                                  onValueChange={(v) => {
                                    const n = parseInt(v ?? "", 10) ?? 0;
                                    setSupplyForRoute(r.id, "supply_one_way_count", n);
                                    if (n === 0) setPriceForRouteKey(routeKey(r), "one_way_price", null);
                                  }}
                                  disabled={oneWayDisabled}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {oneWayOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </>
                          )}
                          {mySubmission && !canSubmit && (
                            <>
                              <TableCell className="pl-5">{s.supply_round_trip_count === 0 ? "배차불가" : s.supply_round_trip_count}</TableCell>
                              <TableCell className="pr-4">{s.supply_one_way_count === 0 ? "배차불가" : s.supply_one_way_count}</TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {canSubmit && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>가격 (노선 기준, 날짜 무관)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pl-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pr-4">노선</TableHead>
                        <TableHead className="pr-4">왕복 공급가</TableHead>
                        <TableHead className="pr-4">편도 공급가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRoutes.map((r) => {
                        const key = routeKey(r);
                        const p = getPriceByRouteKey(key);
                        const s = getSupply(r.id);
                        const roundPriceDisabled = r.required_round_trip_count === 0 || s.supply_round_trip_count === 0;
                        const oneWayPriceDisabled = r.required_one_way_count === 0 || s.supply_one_way_count === 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="pr-4">{r.departure_points?.name ?? "-"}</TableCell>
                            <TableCell className="pr-4">
                              <Input
                                type="number"
                                min={0}
                                disabled={roundPriceDisabled}
                                value={roundPriceDisabled ? "" : (p.round_trip_price ?? "")}
                                onChange={(e) => setPriceForRouteKey(key, "round_trip_price", parseInt(e.target.value, 10) || null)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell className="pr-4">
                              <Input
                                type="number"
                                min={0}
                                disabled={oneWayPriceDisabled}
                                value={oneWayPriceDisabled ? "" : (p.one_way_price ?? "")}
                                onChange={(e) => setPriceForRouteKey(key, "one_way_price", parseInt(e.target.value, 10) || null)}
                                className="w-32"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {mySubmission && !canSubmit && (
              <Card className="mt-6 max-w-md">
                <CardHeader>
                  <CardTitle>제출 가격</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pl-6">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: 72 }} />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-0 pr-4" style={{ width: 72 }}>노선</TableHead>
                        <TableHead className="min-w-0 px-4" style={{ width: 120 }}>왕복 공급가</TableHead>
                        <TableHead className="min-w-0 pl-4 pr-4" style={{ width: 120 }}>편도 공급가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRoutes.map((r) => {
                        const p = getPriceByRouteKey(routeKey(r));
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="min-w-0 pr-4" style={{ width: 72 }}>{r.departure_points?.name ?? "-"}</TableCell>
                            <TableCell className="min-w-0 px-4" style={{ width: 120 }}>{p.round_trip_price ?? "-"}</TableCell>
                            <TableCell className="min-w-0 pl-4 pr-4" style={{ width: 120 }}>{p.one_way_price ?? "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </table>
                  <p className="mt-2 text-sm text-muted-foreground">제출 완료 · 수정 불가</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          ); })}
      </Tabs>

      {isRequester && (rfq.status === "open" || rfq.status === "in_review" || rfq.status === "completed") && (
        <Card>
          <CardHeader>
            <CardTitle>참여 공급사 견적</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base">
              {submissions.length === 0 ? (
                "아직 제출된 견적이 없습니다."
              ) : (
                <>
                  현재 <span className="font-bold text-primary">{submissions.length}개</span>의 견적이 제출되었습니다.
                </>
              )}
            </p>
            <Link href={`/rfqs/${id}/compare`}>
              <Button>
                견적 비교하기 →
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {canSubmit && (
        <div className="flex items-center gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={submitting || !hasAnySupply}>
            {submitting ? "제출 중..." : "견적 제출하기"}
          </Button>
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" aria-hidden onClick={() => setCancelModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <p className="text-center text-base font-medium">정말 취소하겠습니까?</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
              >
                아니오
              </Button>
              <Button
                variant="destructive"
                disabled={cancelLoading}
                onClick={async () => {
                  setCancelLoading(true);
                  setError("");
                  const res = await api.post(`/rfqs/${id}/cancel`, {});
                  setCancelLoading(false);
                  if (res.error) setError(res.error);
                  else {
                    setCancelModalOpen(false);
                    window.location.reload();
                  }
                }}
              >
                {cancelLoading ? "취소 중..." : "네"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
