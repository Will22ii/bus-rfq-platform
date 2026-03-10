import { NextRequest } from "next/server";
import { requireRequester } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

type SelectBody =
  | { supplier_submission_id: string }
  | { selection: "none" };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const authResult = await requireRequester(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { routeId } = await params;
  if (!routeId) return jsonError("route_id required", 400);

  let body: SelectBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { data: route, error: routeErr } = await supabase
    .from("rfq_routes")
    .select("id, rfq_date_id")
    .eq("id", routeId)
    .single();

  if (routeErr || !route) return jsonError("Route not found", 404);

  const { data: rfqDate } = await supabase
    .from("rfq_dates")
    .select("rfq_id")
    .eq("id", route.rfq_date_id)
    .single();

  if (!rfqDate) return jsonError("RFQ date not found", 404);

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, requester_company_id, status")
    .eq("id", rfqDate.rfq_id)
    .single();

  if (!rfq) return jsonError("RFQ not found", 404);
  if (rfq.requester_company_id !== auth.company.id) {
    return jsonError("Not the requester of this RFQ", 403);
  }
  if (rfq.status !== "in_review") {
    return jsonError("RFQ must be in_review to select supplier (not open)", 400);
  }

  const now = new Date().toISOString();

  if ("selection" in body && body.selection === "none") {
    const { error: updErr } = await supabase
      .from("rfq_route_selections")
      .update({
        selection_status: "none",
        selected_supplier_submission_id: null,
        selected_by_user_id: auth.profile.id,
        selected_at: now,
      })
      .eq("rfq_route_id", routeId);

    if (updErr) return jsonError(updErr.message, 500);
    return jsonSuccess({ selection_status: "none" });
  }

  if ("supplier_submission_id" in body && body.supplier_submission_id) {
    const subId = body.supplier_submission_id;

    const { data: sub } = await supabase
      .from("rfq_supplier_submissions")
      .select("id, rfq_id")
      .eq("id", subId)
      .eq("rfq_id", rfq.id)
      .single();

    if (!sub) return jsonError("Invalid supplier_submission_id for this RFQ", 400);

    const { error: updErr } = await supabase
      .from("rfq_route_selections")
      .update({
        selection_status: "selected",
        selected_supplier_submission_id: subId,
        selected_by_user_id: auth.profile.id,
        selected_at: now,
      })
      .eq("rfq_route_id", routeId);

    if (updErr) return jsonError(updErr.message, 500);
    return jsonSuccess({ selection_status: "selected", supplier_submission_id: subId });
  }

  return jsonError("Provide supplier_submission_id or selection: 'none'", 400);
}
