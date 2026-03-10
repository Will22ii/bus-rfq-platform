import { NextRequest } from "next/server";
import { requireRequester } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRequester(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { id: rfqId } = await params;
  if (!rfqId) return jsonError("RFQ id required", 400);

  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id, requester_company_id, status")
    .eq("id", rfqId)
    .single();

  if (rfqErr || !rfq) return jsonError("RFQ not found", 404);
  if (rfq.requester_company_id !== auth.company.id) {
    return jsonError("Not the requester of this RFQ", 403);
  }
  if (rfq.status !== "in_review") {
    return jsonError("RFQ must be in_review to complete", 400);
  }

  const { data: rfqDates } = await supabase
    .from("rfq_dates")
    .select("id")
    .eq("rfq_id", rfqId);
  const dateIds = (rfqDates ?? []).map((d) => d.id);
  if (dateIds.length === 0) return jsonError("RFQ has no dates", 400);

  const { data: routes } = await supabase
    .from("rfq_routes")
    .select("id")
    .in("rfq_date_id", dateIds);
  const routeIds = (routes ?? []).map((r: { id: string }) => r.id);

  const { data: selections, error: selErr } = await supabase
    .from("rfq_route_selections")
    .select("id, rfq_route_id, selection_status")
    .in("rfq_route_id", routeIds);

  if (selErr) return jsonError(selErr.message, 500);

  const selectionRouteIds = new Set(
    (selections ?? []).map((s: { rfq_route_id: string }) => s.rfq_route_id)
  );
  const everyRouteHasSelection = routeIds.every((id) => selectionRouteIds.has(id));
  const everySelectionDecided = (selections ?? []).every(
    (s: { selection_status: string }) =>
      s.selection_status === "selected" || s.selection_status === "none"
  );

  if (!everyRouteHasSelection || !everySelectionDecided) {
    return jsonError(
      "Every route must have a selection (selected or none) before completing"
    );
  }

  const now = new Date().toISOString();
  const listVisibleUntil = new Date();
  listVisibleUntil.setDate(listVisibleUntil.getDate() + 10);

  const { error: updErr } = await supabase
    .from("rfqs")
    .update({
      status: "completed",
      completed_at: now,
      list_visible_until_at: listVisibleUntil.toISOString(),
    })
    .eq("id", rfqId);

  if (updErr) return jsonError(updErr.message, 500);

  return jsonSuccess({ status: "completed" });
}
