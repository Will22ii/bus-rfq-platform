import { NextRequest } from "next/server";
import { requireRequester } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";
import {
  createNotification,
  getRecipientUserIdsByCompanyIds,
} from "@/lib/notifications";

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
  if (rfq.status !== "open" && rfq.status !== "in_review") {
    return jsonError("Only open or in_review RFQ can be cancelled", 400);
  }

  const now = new Date().toISOString();
  const listVisibleUntil = new Date();
  listVisibleUntil.setDate(listVisibleUntil.getDate() + 10);

  const { error: updErr } = await supabase
    .from("rfqs")
    .update({
      status: "cancelled",
      cancelled_at: now,
      list_visible_until_at: listVisibleUntil.toISOString(),
    })
    .eq("id", rfqId);

  if (updErr) return jsonError(updErr.message, 500);

  const { data: submissions } = await supabase
    .from("rfq_supplier_submissions")
    .select("supplier_company_id")
    .eq("rfq_id", rfqId);
  const companyIds = [...new Set((submissions ?? []).map((s) => s.supplier_company_id))];
  const recipientUserIds = await getRecipientUserIdsByCompanyIds(companyIds);
  for (const uid of recipientUserIds) {
    await createNotification(uid, "rfq_cancelled", rfqId);
  }

  return jsonSuccess({ status: "cancelled" });
}
