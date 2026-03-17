"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";

type RfqDate = { id: string; rfq_id: string; service_date: string; sort_order: number };
type Route = {
  id: string;
  rfq_date_id: string;
  destination: string;
  departure_points: { id: string; name: string; region: string } | null;
  arrival_time_round1: string | null;
  bus_type: string;
  required_round_trip_count: number;
  required_one_way_count: number;
};
type Submission = { id: string; company_name?: string; public_phone?: string; supplier_label?: string };
type Supply = { rfq_route_id: string; supplier_submission_id: string; supply_round_trip_count: number; supply_one_way_count: number };
type Price = { rfq_route_id: string; supplier_submission_id: string; round_trip_price: number | null; one_way_price: number | null };
type Selection = { rfq_route_id: string; selection_status: string; selected_supplier_submission_id: string | null };

const BUS_LABEL: Record<string, string> = { "44_seat": "44인승", "31_seat": "31인승", "28_seat": "28인승" };

/** 좌측 고정: 노선, 버스타입, 필요대수(간격·필요대수 폭 확대). 가변: 공급사당 120. 우측 고정: 선택 180 */
const W_NODE = 44;
const W_BUS = 52;
const W_REQ = 100;
const W_SUPPLIER = 120;
const W_SELECT = 180;
/** 노선별 가격 테이블: 노선 열(가변영역과 간격 크게 축소) */
const W_NODE_PRICE = 24;
const STICKY_LEFT_2 = W_NODE;
const STICKY_LEFT_3 = W_NODE + W_BUS;

type RegionFilter = "all" | "metro" | "local";

function filterRoutesByRegion(routes: Route[], region: RegionFilter): Route[] {
  if (region === "all") return routes;
  return routes.filter((r) => r.departure_points?.region === region);
}

export default function RfqComparePage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useAuth();
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [data, setData] = useState<{
    status?: string;
    rfq_dates: RfqDate[];
    routes: Route[];
    supplier_submissions: Submission[];
    route_supply: Supply[];
    route_prices: Price[];
    route_selections: Selection[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isCompleted = data?.status === "completed";
  const isCancelled = data?.status === "cancelled";
  /** open: 비교만 가능(선택/완료 불가). cancelled: 선택/완료 불가. in_review/completed: 선택·완료 가능 */
  const isReadOnly = data?.status === "open" || isCancelled;

  useEffect(() => {
    if (!id) return;
    api.get<{
      rfq_dates: RfqDate[];
      routes: Route[];
      supplier_submissions: Submission[];
      route_supply: Supply[];
      route_prices: Price[];
      route_selections: Selection[];
    }>(`/rfqs/${id}/compare`).then((res) => {
      if (res.error) setError(res.error);
      else if (res.data) setData(res.data as unknown as typeof data);
      setLoading(false);
    });
  }, [id]);

  const handleSelect = async (routeId: string, submissionId: string | null) => {
    setSubmitting(routeId);
    setError("");
    const res = submissionId
      ? await api.post(`/routes/${routeId}/select`, { supplier_submission_id: submissionId })
      : await api.post(`/routes/${routeId}/select`, { selection: "none" });
    setSubmitting(null);
    if (res.error) setError(res.error);
    else if (data) {
      setData({
        ...data,
        route_selections: data.route_selections.map((s) =>
          s.rfq_route_id === routeId
            ? { ...s, selection_status: submissionId ? "selected" : "none", selected_supplier_submission_id: submissionId }
            : s
        ),
      });
    }
  };

  const handleComplete = async () => {
    setError("");
    const res = await api.post(`/rfqs/${id}/complete`, {});
    if (res.error) setError(res.error);
    else window.location.reload();
  };

  if (loading) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (error && !data) return <p className="text-destructive">{error}</p>;
  if (!data) return null;

  const routes = data.routes ?? [];
  const rfqDates = data.rfq_dates ?? [];
  const submissions = data.supplier_submissions ?? [];
  const supply = data.route_supply ?? [];
  const prices = data.route_prices ?? [];
  const selections = data.route_selections ?? [];
  const allSelected = routes.length > 0 && routes.every((r) => selections.some((s) => s.rfq_route_id === r.id));

  const routesByDateId = (dateId: string) => routes.filter((r) => r.rfq_date_id === dateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/rfqs/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" />
            상세로
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">
          {isReadOnly ? "견적 비교 보기" : "견적 비교 및 공급사 선택"}
        </h1>
      </div>

      {rfqDates.length === 0 ? (
        <p className="text-muted-foreground">운행 날짜가 없습니다.</p>
      ) : (
        <Tabs defaultValue={rfqDates[0]?.id ?? ""} className="space-y-4">
          <TabsList>
            {rfqDates.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.service_date}
              </TabsTrigger>
            ))}
          </TabsList>
          {rfqDates.map((date) => {
            const dateRoutes = routesByDateId(date.id);
            return (
              <TabsContent key={date.id} value={date.id} className="space-y-4">
                <Tabs value={regionFilter} onValueChange={(v) => setRegionFilter(v as RegionFilter)}>
                  <TabsList>
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="metro">수도권</TabsTrigger>
                    <TabsTrigger value="local">지방</TabsTrigger>
                  </TabsList>
                  {(["all", "metro", "local"] as const).map((region) => {
                    const displayedRoutes = filterRoutesByRegion(dateRoutes, region);
                    return (
                      <TabsContent key={region} value={region} className="space-y-6 mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>노선별 공급 현황</CardTitle>
                          </CardHeader>
                          <CardContent className="overflow-x-auto p-0 pl-6">
                            <table className="min-w-max table-fixed border-collapse text-sm">
                              <colgroup>
                                <col style={{ width: W_NODE }} />
                                <col style={{ width: W_BUS }} />
                                <col style={{ width: W_REQ }} />
                                {submissions.map((sub) => (
                                  <col key={sub.id} style={{ width: W_SUPPLIER }} />
                                ))}
                                {!isReadOnly && <col style={{ width: W_SELECT }} />}
                              </colgroup>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="sticky left-0 z-10 bg-card pr-[20px]" style={{ width: W_NODE, minWidth: W_NODE }}>노선</TableHead>
                                  <TableHead className="sticky z-10 bg-card pr-[20px]" style={{ left: STICKY_LEFT_2, width: W_BUS, minWidth: W_BUS }}>버스 타입</TableHead>
                                  <TableHead className="sticky z-10 border-r-2 border-border bg-card pr-[28px] shadow-[2px_0_0_0_hsl(var(--border))]" style={{ left: STICKY_LEFT_3, width: W_REQ, minWidth: W_REQ }}>필요 대수</TableHead>
                                  {submissions.map((sub) => (
                                    <TableHead key={sub.id} className="min-w-[120px] shrink-0" style={{ width: W_SUPPLIER }}>
                                      {sub.supplier_label ?? sub.company_name ?? "공급사"}
                                    </TableHead>
                                  ))}
                                  {!isReadOnly && (
                                    <TableHead className="sticky right-0 z-10 min-w-[180px] border-l-2 border-border bg-card shadow-[-2px_0_0_0_hsl(var(--border))]" style={{ width: W_SELECT }}>공급사 선택</TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {displayedRoutes.map((r) => {
                                  const sel = selections.find((s) => s.rfq_route_id === r.id);
                                  return (
                                    <TableRow key={r.id}>
                                      <TableCell className="sticky left-0 z-[1] bg-background pr-[20px]" style={{ width: W_NODE }}>{r.departure_points?.name ?? "-"}</TableCell>
                                      <TableCell className="sticky z-[1] bg-background pr-[20px]" style={{ left: STICKY_LEFT_2, width: W_BUS }}>{BUS_LABEL[r.bus_type] ?? r.bus_type}</TableCell>
                                      <TableCell className="sticky z-[1] min-w-0 border-r-2 border-border bg-background pr-[28px] whitespace-nowrap" style={{ left: STICKY_LEFT_3, width: W_REQ }}>왕복 {r.required_round_trip_count} / 편도 {r.required_one_way_count}</TableCell>
                                      {submissions.map((sub) => {
                                        const s = supply.find((x) => x.rfq_route_id === r.id && x.supplier_submission_id === sub.id);
                                        return (
                                          <TableCell key={sub.id} className="shrink-0" style={{ width: W_SUPPLIER }}>
                                            {s ? `왕복 ${s.supply_round_trip_count} / 편도 ${s.supply_one_way_count}` : "-"}
                                          </TableCell>
                                        );
                                      })}
                                      {!isReadOnly && (
                                        <TableCell className="sticky right-0 z-[1] border-l-2 border-border bg-background" style={{ width: W_SELECT }}>
                                          <div className="flex flex-col gap-1">
                                            {submissions.map((sub) => (
                                              <label key={sub.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                  type="radio"
                                                  name={`select-${r.id}`}
                                                  checked={sel?.selected_supplier_submission_id === sub.id}
                                                  onChange={() => handleSelect(r.id, sub.id)}
                                                  disabled={!!submitting}
                                                />
                                                {sub.supplier_label ?? sub.company_name ?? "공급사"}
                                              </label>
                                            ))}
                                            <label className="flex items-center gap-2 text-sm">
                                              <input
                                                type="radio"
                                                name={`select-${r.id}`}
                                                checked={sel?.selection_status === "none"}
                                                onChange={() => handleSelect(r.id, null)}
                                                disabled={!!submitting}
                                              />
                                              선택 안함
                                            </label>
                                          </div>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </table>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>노선별 가격</CardTitle>
                          </CardHeader>
                          <CardContent className="overflow-x-auto p-0 pl-6">
                            <table className="min-w-max table-fixed border-collapse text-sm">
                              <colgroup>
                                <col style={{ width: W_NODE_PRICE }} />
                                {submissions.map((sub) => (
                                  <col key={sub.id} style={{ width: W_SUPPLIER }} />
                                ))}
                              </colgroup>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="sticky left-0 z-10 border-r-2 border-border bg-card shadow-[2px_0_0_0_hsl(var(--border))]" style={{ width: W_NODE_PRICE, minWidth: W_NODE_PRICE }}>노선</TableHead>
                                  {submissions.map((sub) => (
                                    <TableHead key={sub.id} className="min-w-[120px] shrink-0" style={{ width: W_SUPPLIER }}>
                                      {sub.supplier_label ?? sub.company_name ?? "공급사"} 왕복/편도
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {displayedRoutes.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell className="sticky left-0 z-[1] border-r-2 border-border bg-background" style={{ width: W_NODE_PRICE }}>{r.departure_points?.name ?? "-"}</TableCell>
                                    {submissions.map((sub) => {
                                      const p = prices.find((x) => x.rfq_route_id === r.id && x.supplier_submission_id === sub.id);
                                      return (
                                        <TableCell key={sub.id} className="shrink-0" style={{ width: W_SUPPLIER }}>
                                          {p ? `${p.round_trip_price ?? "-"} / ${p.one_way_price ?? "-"}` : "-"}
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </table>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isReadOnly && !isCompleted && (
        <Button onClick={handleComplete} disabled={!allSelected}>
          RFQ 완료하기
        </Button>
      )}

      {isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>선택된 공급사 연락처</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>공급사</TableHead>
                  <TableHead>전화번호</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions
                  .filter((sub) => selections.some((s) => s.selected_supplier_submission_id === sub.id))
                  .map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.company_name ?? "-"}</TableCell>
                      <TableCell>{sub.public_phone ?? "-"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
