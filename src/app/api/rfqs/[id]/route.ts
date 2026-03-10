import { NextRequest } from "next/server";
import { requireRequesterOrSupplier } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRequesterOrSupplier(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { id: rfqId } = await params;
  if (!rfqId) return jsonError("RFQ id required", 400);

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("*")
    .eq("id", rfqId)
    .single();

  if (rfqError || !rfq) {
    return jsonError("RFQ not found", 404);
  }

  const now = new Date().toISOString();
  if (rfq.status === "open" && rfq.quote_deadline_at && new Date(rfq.quote_deadline_at) < new Date()) {
    await supabase
      .from("rfqs")
      .update({ status: "in_review", review_started_at: now })
      .eq("id", rfqId);
    rfq.status = "in_review";
    rfq.review_started_at = now;
  }

  const isRequester = rfq.requester_company_id === auth.company.id;

  const { data: rfqDates, error: datesError } = await supabase
    .from("rfq_dates")
    .select("id, rfq_id, service_date, sort_order")
    .eq("rfq_id", rfqId)
    .order("sort_order", { ascending: true });

  if (datesError) return jsonError(datesError.message, 500);

  const dateIds = (rfqDates ?? []).map((d) => d.id);
  if (dateIds.length === 0) {
    return jsonSuccess({
      ...rfq,
      rfq_dates: rfqDates ?? [],
      rfq_routes: [],
      rfq_supplier_submissions: [],
      rfq_supplier_route_supply: [],
      rfq_supplier_route_prices: [],
      rfq_route_selections: [],
    });
  }

  const { data: rfqRoutes, error: routesError } = await supabase
    .from("rfq_routes")
    .select(`
      *,
      departure_points(id, name, region)
    `)
    .in("rfq_date_id", dateIds)
    .order("rfq_date_id")
    .order("sort_order", { ascending: true });

  if (routesError) return jsonError(routesError.message, 500);

  if (isRequester) {
    const { data: submissionsRaw } = await supabase
      .from("rfq_supplier_submissions")
      .select("id, rfq_id, supplier_company_id, submitted_at")
      .eq("rfq_id", rfqId)
      .order("submitted_at", { ascending: true });

    const submissionsList = (submissionsRaw ?? []) as { id: string; rfq_id: string; supplier_company_id: string; submitted_at: string }[];
    const companyIds = [...new Set(submissionsList.map((s) => s.supplier_company_id))];

    const [companiesRes, profilesRes] = await Promise.all([
      companyIds.length > 0
        ? supabase.from("companies").select("id, name").in("id", companyIds)
        : { data: [] as { id: string; name: string }[] },
      companyIds.length > 0
        ? supabase.from("user_profiles").select("company_id, public_phone").in("company_id", companyIds)
        : { data: [] as { company_id: string; public_phone: string | null }[] },
    ]);

    const companyMap = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
    const phoneByCompanyId = new Map(
      (profilesRes.data ?? []).map((p) => [p.company_id, p.public_phone])
    );

    const routeIds = (rfqRoutes ?? []).map((r: { id: string }) => r.id);
    const [supplyRes, pricesRes, selectionsRes] = await Promise.all([
      supabase.from("rfq_supplier_route_supply").select("*").in("rfq_route_id", routeIds),
      supabase.from("rfq_supplier_route_prices").select("*").in("rfq_route_id", routeIds),
      supabase.from("rfq_route_selections").select("*, rfq_supplier_submissions(id, supplier_company_id)").in("rfq_route_id", routeIds),
    ]);

    const selectedSubmissionIds = new Set(
      (selectionsRes.data ?? [])
        .filter((sel: { selection_status: string }) => sel.selection_status === "selected")
        .map((sel: { selected_supplier_submission_id: string }) => sel.selected_supplier_submission_id)
    );
    const isCompleted = rfq.status === "completed";
    const MASKED = "***";
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const rfq_supplier_submissions = submissionsList.map((s, i) => {
      const selected = selectedSubmissionIds.has(s.id);
      const showContact = isCompleted && selected;
      const label = i < labels.length ? `공급사 ${labels[i]}` : `공급사 ${i + 1}`;
      return {
        ...s,
        company_name: showContact ? (companyMap.get(s.supplier_company_id) ?? MASKED) : MASKED,
        public_phone: showContact ? (phoneByCompanyId.get(s.supplier_company_id) ?? null) : MASKED,
        supplier_label: label,
      };
    });

    return jsonSuccess({
      ...rfq,
      rfq_dates: rfqDates ?? [],
      rfq_routes: rfqRoutes ?? [],
      rfq_supplier_submissions,
      rfq_supplier_route_supply: supplyRes.data ?? [],
      rfq_supplier_route_prices: pricesRes.data ?? [],
      rfq_route_selections: selectionsRes.data ?? [],
    });
  }

  const mySubmission = await supabase
    .from("rfq_supplier_submissions")
    .select("*")
    .eq("rfq_id", rfqId)
    .eq("supplier_company_id", auth.company.id)
    .maybeSingle();

  const rfq_supplier_submissions = mySubmission.data ? [mySubmission.data] : [];
  const submissionId = mySubmission.data?.id;
  let rfq_supplier_route_supply: unknown[] = [];
  let rfq_supplier_route_prices: unknown[] = [];

  if (submissionId) {
    const routeIds = (rfqRoutes ?? []).map((r: { id: string }) => r.id);
    const [sRes, pRes] = await Promise.all([
      supabase.from("rfq_supplier_route_supply").select("*").eq("supplier_submission_id", submissionId).in("rfq_route_id", routeIds),
      supabase.from("rfq_supplier_route_prices").select("*").eq("supplier_submission_id", submissionId).in("rfq_route_id", routeIds),
    ]);
    rfq_supplier_route_supply = sRes.data ?? [];
    rfq_supplier_route_prices = pRes.data ?? [];
  }

  return jsonSuccess({
    ...rfq,
    rfq_dates: rfqDates ?? [],
    rfq_routes: rfqRoutes ?? [],
    rfq_supplier_submissions,
    rfq_supplier_route_supply,
    rfq_supplier_route_prices,
    rfq_route_selections: [],
  });
}
