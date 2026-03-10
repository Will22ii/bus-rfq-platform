import { NextRequest } from "next/server";
import { requireRequester } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

const MASKED = "***";

export async function GET(
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
    .select("*")
    .eq("id", rfqId)
    .single();

  if (rfqErr || !rfq) return jsonError("RFQ not found", 404);
  if (rfq.requester_company_id !== auth.company.id) {
    return jsonError("Not the requester of this RFQ", 403);
  }

  const { data: rfqDates } = await supabase
    .from("rfq_dates")
    .select("id, rfq_id, service_date, sort_order")
    .eq("rfq_id", rfqId)
    .order("sort_order", { ascending: true });

  const dateIds = (rfqDates ?? []).map((d) => d.id);
  if (dateIds.length === 0) {
    return jsonSuccess({
      routes: [],
      supplier_submissions: [],
      route_supply: [],
      route_prices: [],
      route_selections: [],
    });
  }

  const { data: rfqRoutes } = await supabase
    .from("rfq_routes")
    .select(`
      *,
      departure_points(id, name, region)
    `)
    .in("rfq_date_id", dateIds)
    .order("rfq_date_id")
    .order("sort_order", { ascending: true });

  const routes = rfqRoutes ?? [];
  const routeIds = routes.map((r: { id: string }) => r.id);

  const { data: submissionsRaw } = await supabase
    .from("rfq_supplier_submissions")
    .select("id, rfq_id, supplier_company_id, submitted_at")
    .eq("rfq_id", rfqId)
    .order("submitted_at", { ascending: true });

  const submissions = submissionsRaw ?? [];

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .in(
      "id",
      (submissions ?? []).map((s: { supplier_company_id: string }) => s.supplier_company_id)
    );

  const companyMap = new Map((companies ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("company_id, public_phone")
    .in(
      "company_id",
      (submissions ?? []).map((s: { supplier_company_id: string }) => s.supplier_company_id)
    );

  const phoneByCompanyId = new Map(
    (userProfiles ?? []).map((p: { company_id: string; public_phone: string | null }) => [p.company_id, p.public_phone])
  );

  const [supplyRes, pricesRes, selectionsRes] = await Promise.all([
    supabase.from("rfq_supplier_route_supply").select("*").in("rfq_route_id", routeIds),
    supabase.from("rfq_supplier_route_prices").select("*").in("rfq_route_id", routeIds),
    supabase.from("rfq_route_selections").select("*").in("rfq_route_id", routeIds),
  ]);

  const selectedSubmissionIds = new Set(
    (selectionsRes.data ?? [])
      .filter((sel: { selection_status: string }) => sel.selection_status === "selected")
      .map((sel: { selected_supplier_submission_id: string }) => sel.selected_supplier_submission_id)
  );

  const isCompleted = rfq.status === "completed";
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const supplier_submissions = submissions.map(
    (s: { id: string; rfq_id: string; supplier_company_id: string; submitted_at: string }, i: number) => {
      const selected = selectedSubmissionIds.has(s.id);
      const showContact = isCompleted && selected;
      const label = i < labels.length ? `공급사 ${labels[i]}` : `공급사 ${i + 1}`;
      return {
        ...s,
        company_name: showContact
          ? (companyMap.get(s.supplier_company_id) ?? null)
          : MASKED,
        public_phone: showContact
          ? (phoneByCompanyId.get(s.supplier_company_id) ?? null)
          : MASKED,
        supplier_label: label,
      };
    }
  );

  return jsonSuccess({
    status: rfq.status,
    routes,
    supplier_submissions,
    route_supply: supplyRes.data ?? [],
    route_prices: pricesRes.data ?? [],
    route_selections: selectionsRes.data ?? [],
  });
}
