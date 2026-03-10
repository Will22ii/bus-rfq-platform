import { NextRequest } from "next/server";
import { requireSupplier } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const authResult = await requireSupplier(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { data: submissions, error: subErr } = await supabase
    .from("rfq_supplier_submissions")
    .select(`
      id,
      rfq_id,
      supplier_company_id,
      submitted_at,
      rfqs (
        id,
        title,
        concert_name,
        venue,
        status,
        quote_deadline_at
      )
    `)
    .eq("supplier_company_id", auth.company.id)
    .order("submitted_at", { ascending: false });

  if (subErr) return jsonError(subErr.message, 500);

  const list = (submissions ?? []).map((s: { rfqs: unknown } & Record<string, unknown>) => ({
    id: s.id,
    rfq_id: s.rfq_id,
    supplier_company_id: s.supplier_company_id,
    submitted_at: s.submitted_at,
    rfq: s.rfqs,
  }));

  return jsonSuccess(list);
}
