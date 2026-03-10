import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

/** 문서 13절: Success = 하나 이상 노선 선택됨, Fail = 모든 노선 선택 안함 (completed RFQ만) */

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if ("error" in authResult) return authResult.error;

  const { count: total, error: totalError } = await supabase
    .from("rfqs")
    .select("id", { count: "exact", head: true });
  if (totalError) return jsonError(totalError.message, 500);

  const { data: completedRfqs, error: completedError } = await supabase
    .from("rfqs")
    .select("id")
    .eq("status", "completed");
  if (completedError) return jsonError(completedError.message, 500);
  const completedIds = (completedRfqs ?? []).map((r) => r.id);
  const completedCount = completedIds.length;

  if (completedCount === 0) {
    return jsonSuccess({
      total: total ?? 0,
      completedCount: 0,
      successRfqCount: 0,
      failRfqCount: 0,
      rfqSuccessRatePercent: null,
      routeTotal: 0,
      routeSelectedCount: 0,
      routeSuccessRatePercent: null,
    });
  }

  const { data: dates, error: datesError } = await supabase
    .from("rfq_dates")
    .select("id, rfq_id")
    .in("rfq_id", completedIds);
  if (datesError) return jsonError(datesError.message, 500);
  const dateIds = (dates ?? []).map((d) => d.id);
  const rfqIdByDateId = Object.fromEntries((dates ?? []).map((d) => [d.id, d.rfq_id]));

  const { data: routes, error: routesError } = await supabase
    .from("rfq_routes")
    .select("id, rfq_date_id")
    .in("rfq_date_id", dateIds);
  if (routesError) return jsonError(routesError.message, 500);
  const routeIds = (routes ?? []).map((r) => r.id);
  const routeToRfqId: Record<string, string> = {};
  for (const r of routes ?? []) {
    routeToRfqId[r.id] = rfqIdByDateId[r.rfq_date_id];
  }

  const { data: selections, error: selError } = await supabase
    .from("rfq_route_selections")
    .select("rfq_route_id, selection_status")
    .in("rfq_route_id", routeIds);
  if (selError) return jsonError(selError.message, 500);

  const routeSelected = new Set<string>();
  const selectedByRfq: Record<string, number> = {};
  const routeCountByRfq: Record<string, number> = {};
  for (const s of selections ?? []) {
    const rfqId = routeToRfqId[s.rfq_route_id];
    if (!rfqId) continue;
    routeCountByRfq[rfqId] = (routeCountByRfq[rfqId] ?? 0) + 1;
    if (s.selection_status === "selected") {
      routeSelected.add(s.rfq_route_id);
      selectedByRfq[rfqId] = (selectedByRfq[rfqId] ?? 0) + 1;
    }
  }
  for (const rfqId of completedIds) {
    if (routeCountByRfq[rfqId] == null) {
      const dateIdsForRfq = (dates ?? []).filter((d) => d.rfq_id === rfqId).map((d) => d.id);
      const routesForRfq = (routes ?? []).filter((r) => dateIdsForRfq.includes(r.rfq_date_id));
      routeCountByRfq[rfqId] = routesForRfq.length;
    }
  }

  let successRfqCount = 0;
  let failRfqCount = 0;
  for (const rfqId of completedIds) {
    const selected = selectedByRfq[rfqId] ?? 0;
    if (selected > 0) successRfqCount++;
    else failRfqCount++;
  }

  const routeTotal = routeIds.length;
  const routeSelectedCount = routeSelected.size;
  const rfqSuccessRatePercent =
    completedCount > 0 ? Math.round((successRfqCount / completedCount) * 1000) / 10 : null;
  const routeSuccessRatePercent =
    routeTotal > 0 ? Math.round((routeSelectedCount / routeTotal) * 1000) / 10 : null;

  return jsonSuccess({
    total: total ?? 0,
    completedCount,
    successRfqCount,
    failRfqCount,
    rfqSuccessRatePercent,
    routeTotal,
    routeSelectedCount,
    routeSuccessRatePercent,
  });
}
