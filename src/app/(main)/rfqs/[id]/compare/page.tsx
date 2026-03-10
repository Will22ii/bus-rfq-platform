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
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { ArrowLeft } from "lucide-react";

type Route = { id: string; destination: string; arrival_time_round1: string | null; bus_type: string; required_round_trip_count: number; required_one_way_count: number };
type Submission = { id: string; company_name?: string; public_phone?: string; supplier_label?: string };
type Supply = { rfq_route_id: string; supplier_submission_id: string; supply_round_trip_count: number; supply_one_way_count: number };
type Price = { rfq_route_id: string; supplier_submission_id: string; round_trip_price: number | null; one_way_price: number | null };
type Selection = { rfq_route_id: string; selection_status: string; selected_supplier_submission_id: string | null };

const BUS_LABEL: Record<string, string> = { "44_seat": "44인승", "31_seat": "31인승", "28_seat": "28인승" };

export default function RfqComparePage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useAuth();
  const [data, setData] = useState<{
    status?: string;
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
  const isReadOnly = data?.status === "open";

  useEffect(() => {
    if (!id) return;
    api.get<{
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
  const submissions = data.supplier_submissions ?? [];
  const supply = data.route_supply ?? [];
  const prices = data.route_prices ?? [];
  const selections = data.route_selections ?? [];
  const allSelected = routes.length > 0 && routes.every((r) => selections.some((s) => s.rfq_route_id === r.id));

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

      <Card>
        <CardHeader>
          <CardTitle>노선별 공급 현황</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">노선</TableHead>
                <TableHead>버스 타입</TableHead>
                <TableHead>필요 대수</TableHead>
                {submissions.map((sub) => (
                  <TableHead key={sub.id} className="min-w-[100px]">
                    {sub.supplier_label ?? sub.company_name ?? "공급사"}
                  </TableHead>
                ))}
                {!isReadOnly && <TableHead className="min-w-[180px]">공급사 선택</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => {
                const sel = selections.find((s) => s.rfq_route_id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell>{BUS_LABEL[r.bus_type] ?? r.bus_type}</TableCell>
                    <TableCell>왕복 {r.required_round_trip_count} / 편도 {r.required_one_way_count}</TableCell>
                    {submissions.map((sub) => {
                      const s = supply.find((x) => x.rfq_route_id === r.id && x.supplier_submission_id === sub.id);
                      return (
                        <TableCell key={sub.id}>
                          {s ? `왕복 ${s.supply_round_trip_count} / 편도 ${s.supply_one_way_count}` : "-"}
                        </TableCell>
                      );
                    })}
                    {!isReadOnly && (
                      <TableCell>
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
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>노선별 가격</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">노선</TableHead>
                {submissions.map((sub) => (
                  <TableHead key={sub.id} className="min-w-[100px]">
                    {sub.supplier_label ?? sub.company_name ?? "공급사"} 왕복/편도
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.destination}</TableCell>
                  {submissions.map((sub) => {
                    const p = prices.find((x) => x.rfq_route_id === r.id && x.supplier_submission_id === sub.id);
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
        </CardContent>
      </Card>

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
