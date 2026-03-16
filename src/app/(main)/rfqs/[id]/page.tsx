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
  const [error, setError] = useState("");
  const [noSupply, setNoSupply] = useState<Record<string, boolean>>({});

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
        if ((d.rfq_supplier_route_supply ?? []).length === 0 && (d.rfq_routes ?? []).length > 0) {
          const initial: Record<string, boolean> = {};
          (d.rfq_routes ?? []).forEach((r: { id: string }) => {
            initial[r.id] = false;
          });
          setNoSupply(initial);
        }
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
    const no = noSupply[r.id];
    const roundTrip = no ? 0 : s.supply_round_trip_count;
    const oneWay = no ? 0 : s.supply_one_way_count;
    return roundTrip + oneWay >= 1;
  });

  const handleSubmit = async () => {
    setError("");
    const routeIds = rfqRoutes.map((r) => r.id);
    const supplyRows = routeIds.map((rid) => {
      const s = getSupply(rid);
      const no = noSupply[rid];
      return {
        route_id: rid,
        supply_round_trip_count: no ? 0 : s.supply_round_trip_count,
        supply_one_way_count: no ? 0 : s.supply_one_way_count,
        vehicle_year: no ? undefined : s.vehicle_year ?? undefined,
      };
    });
    // 공급이 (0,0)인 노선은 무조건 가격 null 전송(API 규칙). 배차불가 미체크 + 숫자 미입력도 (0,0)으로 전송됨
    const priceRows = rfqRoutes.map((r, i) => {
      const supplyRow = supplyRows[i];
      const hasSupply = (supplyRow.supply_round_trip_count + supplyRow.supply_one_way_count) >= 1;
      const p = getPriceByRouteKey(routeKey(r));
      return {
        route_id: r.id,
        round_trip_price: hasSupply ? p.round_trip_price : null,
        one_way_price: hasSupply ? p.one_way_price : null,
      };
    });
    const valid = supplyRows.every(
      (s) => s.supply_round_trip_count + s.supply_one_way_count >= 1 || (s.supply_round_trip_count === 0 && s.supply_one_way_count === 0)
    );
    if (!valid) {
      setError("각 노선에 공급 대수를 입력하거나 배차불가를 선택하세요.");
      return;
    }
    const anySupply = supplyRows.some(
      (s) => s.supply_round_trip_count + s.supply_one_way_count >= 1
    );
    if (!anySupply) {
      setError("최소 한 노선 이상에 공급 대수를 입력해야 합니다.");
      return;
    }
    // 공급이 있는 노선에는 왕복/편도 가격 필수
    const priceInvalidIdx = supplyRows.findIndex(
      (s, i) => {
        const hasSupply = s.supply_round_trip_count + s.supply_one_way_count >= 1;
        if (!hasSupply) return false;
        const p = priceRows[i];
        return p == null || p.round_trip_price == null || p.one_way_price == null || p.round_trip_price < 0 || p.one_way_price < 0;
      }
    );
    if (priceInvalidIdx >= 0) {
      setError("공급 대수가 있는 모든 노선에 왕복 가격과 편도 가격을 입력해 주세요.");
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
        </div>
        <StatusBadge status={(rfq.status as string) ?? "open"} />
      </div>

      {isRequester && (rfq.status === "open" || rfq.status === "in_review" || rfq.status === "completed") && (
        <div className="flex flex-wrap items-center gap-2">
          {rfq.status === "open" && (
            <Link href={`/rfqs/${id}/compare`}>
              <Button variant="outline">견적 비교 보기</Button>
            </Link>
          )}
          {(rfq.status === "in_review" || rfq.status === "completed") && (
            <Link href={`/rfqs/${id}/compare`}>
              <Button>견적 비교 및 공급사 선택</Button>
            </Link>
          )}
          {(rfq.status === "open" || rfq.status === "in_review") && (
            <Button
              variant="destructive"
              disabled={cancelLoading}
              onClick={async () => {
                if (!confirm("이 RFQ를 취소하시겠습니까?")) return;
                setCancelLoading(true);
                setError("");
                const res = await api.post(`/rfqs/${id}/cancel`, {});
                setCancelLoading(false);
                if (res.error) setError(res.error);
                else window.location.reload();
              }}
            >
              {cancelLoading ? "취소 중..." : "RFQ 취소"}
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue={rfqDates[0]?.id ?? ""}>
        <TabsList>
          {rfqDates.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>
              {d.service_date}
            </TabsTrigger>
          ))}
        </TabsList>
        {routesByDate.map(({ date, routes }) => (
          <TabsContent key={date.id} value={date.id}>
            <Card>
              <CardHeader>
                <CardTitle>노선 테이블</CardTitle>
              </CardHeader>
              <CardContent>
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
                      {canSubmit && (
                        <>
                          <TableHead>배차불가</TableHead>
                          <TableHead>공급 왕복</TableHead>
                          <TableHead>공급 편도</TableHead>
                          <TableHead>연식</TableHead>
                        </>
                      )}
                      {mySubmission && !canSubmit && (
                        <>
                          <TableHead>공급 왕복</TableHead>
                          <TableHead>공급 편도</TableHead>
                          <TableHead>연식</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((r) => {
                      const s = getSupply(r.id);
                      const no = noSupply[r.id];
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.departure_points?.name ?? "-"}
                          </TableCell>
                          <TableCell>{r.arrival_time_round1 ?? "-"}</TableCell>
                          <TableCell>{r.arrival_time_round2 ?? "-"}</TableCell>
                          <TableCell>{r.return_departure_time ?? "-"}</TableCell>
                          <TableCell>{BUS_LABEL[r.bus_type] ?? r.bus_type}</TableCell>
                          <TableCell>{r.required_round_trip_count}</TableCell>
                          <TableCell>{r.required_one_way_count}</TableCell>
                          {canSubmit && (
                            <>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={no}
                                  onChange={(e) => {
                                    setNoSupply((prev) => ({ ...prev, [r.id]: e.target.checked }));
                                    if (e.target.checked) {
                                      setSupplyForRoute(r.id, "supply_round_trip_count", 0);
                                      setSupplyForRoute(r.id, "supply_one_way_count", 0);
                                      setPriceForRouteKey(routeKey(r), "round_trip_price", null);
                                      setPriceForRouteKey(routeKey(r), "one_way_price", null);
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={r.required_round_trip_count}
                                  disabled={no}
                                  value={no ? 0 : s.supply_round_trip_count}
                                  onChange={(e) => setSupplyForRoute(r.id, "supply_round_trip_count", parseInt(e.target.value, 10) || 0)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={r.required_one_way_count}
                                  disabled={no}
                                  value={no ? 0 : s.supply_one_way_count}
                                  onChange={(e) => setSupplyForRoute(r.id, "supply_one_way_count", parseInt(e.target.value, 10) || 0)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1990}
                                  max={2030}
                                  disabled={no}
                                  placeholder="예: 2022"
                                  value={no ? "" : (s.vehicle_year ?? "")}
                                  onChange={(e) => setSupplyForRoute(r.id, "vehicle_year", parseInt(e.target.value, 10) || 0)}
                                  className="w-20"
                                />
                              </TableCell>
                            </>
                          )}
                          {mySubmission && !canSubmit && (
                            <>
                              <TableCell>{s.supply_round_trip_count}</TableCell>
                              <TableCell>{s.supply_one_way_count}</TableCell>
                              <TableCell>{s.vehicle_year ?? "-"}</TableCell>
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
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>노선</TableHead>
                        <TableHead>왕복 공급가</TableHead>
                        <TableHead>편도 공급가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((r) => {
                        const key = routeKey(r);
                        const p = getPriceByRouteKey(key);
                        const s = getSupply(r.id);
                        const no = noSupply[r.id];
                        const hasSupply = !no && s.supply_round_trip_count + s.supply_one_way_count >= 1;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.departure_points?.name ?? "-"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                disabled={!hasSupply}
                                value={!hasSupply ? "" : (p.round_trip_price ?? "")}
                                onChange={(e) => setPriceForRouteKey(key, "round_trip_price", parseInt(e.target.value, 10) || null)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                disabled={!hasSupply}
                                value={!hasSupply ? "" : (p.one_way_price ?? "")}
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
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>제출 가격</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>노선</TableHead>
                        <TableHead>왕복 공급가</TableHead>
                        <TableHead>편도 공급가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((r) => {
                        const p = getPriceByRouteKey(routeKey(r));
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.departure_points?.name ?? "-"}</TableCell>
                            <TableCell>{p.round_trip_price ?? "-"}</TableCell>
                            <TableCell>{p.one_way_price ?? "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="mt-2 text-sm text-muted-foreground">제출 완료 · 수정 불가</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {isRequester && (rfq.status === "open" || rfq.status === "in_review" || rfq.status === "completed") && (
        <Card>
          <CardHeader>
            <CardTitle>참여 공급사 견적</CardTitle>
            <CardDescription>
              {submissions.length === 0
                ? "아직 제출된 견적이 없습니다."
                : `제출된 견적 ${submissions.length}건 (마스킹 처리됨)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length > 0 && (
              <div className="space-y-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">노선</TableHead>
                      <TableHead>버스 타입</TableHead>
                      <TableHead>필요 대수</TableHead>
                      {submissions.map((sub) => (
                        <TableHead key={sub.id} className="min-w-[100px]">
                          {sub.supplier_label ?? sub.company_name ?? "공급사"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(routesByDate[0]?.routes ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.departure_points?.name ?? "-"}</TableCell>
                        <TableCell>{BUS_LABEL[r.bus_type] ?? r.bus_type}</TableCell>
                        <TableCell>왕복 {r.required_round_trip_count} / 편도 {r.required_one_way_count}</TableCell>
                        {submissions.map((sub) => {
                          const s = supply.find((x) => x.rfq_route_id === r.id && (x as { supplier_submission_id?: string }).supplier_submission_id === sub.id);
                          return (
                            <TableCell key={sub.id}>
                              {s ? `왕복 ${s.supply_round_trip_count} / 편도 ${s.supply_one_way_count}` : "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">노선</TableHead>
                      {submissions.map((sub) => (
                        <TableHead key={sub.id} className="min-w-[100px]">
                          {sub.supplier_label ?? sub.company_name ?? "공급사"} 왕복/편도
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(routesByDate[0]?.routes ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.departure_points?.name ?? "-"}</TableCell>
                        {submissions.map((sub) => {
                          const p = routePricesFromApi.find((x) => x.rfq_route_id === r.id && x.supplier_submission_id === sub.id);
                          return (
                            <TableCell key={sub.id}>
                              {p ? `${p.round_trip_price ?? "-"} / ${p.one_way_price ?? "-"}` : "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
    </div>
  );
}
