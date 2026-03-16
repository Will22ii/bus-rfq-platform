import { NextRequest } from "next/server";
import { requireSupplier } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

type RouteSupplyInput = {
  route_id: string;
  supply_round_trip_count: number;
  supply_one_way_count: number;
  vehicle_year?: number;
};

type RoutePriceInput = {
  route_id: string;
  round_trip_price: number | null;
  one_way_price: number | null;
};

type SubmitBody = {
  route_supplies: RouteSupplyInput[];
  route_prices: RoutePriceInput[];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSupplier(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { id: rfqId } = await params;
  if (!rfqId) return jsonError("RFQ id required", 400);

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { route_supplies, route_prices } = body;
  if (!Array.isArray(route_supplies) || !Array.isArray(route_prices)) {
    return jsonError("route_supplies and route_prices arrays required");
  }

  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id, status, requester_company_id, quote_deadline_at")
    .eq("id", rfqId)
    .single();

  if (rfqErr || !rfq) return jsonError("RFQ not found", 404);
  if (rfq.status !== "open") return jsonError("RFQ is not open for submission", 400);
  const now = new Date();
  if (rfq.quote_deadline_at && new Date(rfq.quote_deadline_at) <= now) {
    return jsonError("Quote deadline has passed", 400);
  }
  if (rfq.requester_company_id === auth.company.id) {
    return jsonError("Requester cannot submit a quote to their own RFQ", 403);
  }

  const { data: existing } = await supabase
    .from("rfq_supplier_submissions")
    .select("id")
    .eq("rfq_id", rfqId)
    .eq("supplier_company_id", auth.company.id)
    .maybeSingle();

  if (existing) return jsonError("Already submitted for this RFQ", 400);

  const { data: rfqDates } = await supabase
    .from("rfq_dates")
    .select("id")
    .eq("rfq_id", rfqId);
  const dateIds = rfqDates?.map((d) => d.id) ?? [];
  if (dateIds.length === 0) return jsonError("RFQ has no dates/routes", 400);

  const { data: routes, error: routesErr } = await supabase
    .from("rfq_routes")
    .select("id, required_round_trip_count, required_one_way_count")
    .in("rfq_date_id", dateIds);

  if (routesErr) return jsonError(routesErr.message, 500);
  const routesList = routes ?? [];

  if (
    route_supplies.length !== routesList.length ||
    route_prices.length !== routesList.length
  ) {
    return jsonError("route_supplies and route_prices must have one entry per RFQ route");
  }

  const routeIdsSet = new Set(routesList.map((r: { id: string }) => r.id));
  const supplyRouteIds = new Set(route_supplies.map((s) => s.route_id));
  if (supplyRouteIds.size !== routeIdsSet.size || [...supplyRouteIds].some((id) => !routeIdsSet.has(id))) {
    return jsonError("route_supplies must contain exactly one entry per RFQ route");
  }

  const routeMap = new Map(routesList.map((r: { id: string; required_round_trip_count: number; required_one_way_count: number }) => [r.id, r]));

  let hasAnySupply = false;

  for (let i = 0; i < route_supplies.length; i++) {
    const s = route_supplies[i];
    const req = routeMap.get(s.route_id);
    if (!req) return jsonError(`Invalid route_id: ${s.route_id}`);

    const sum = (s.supply_round_trip_count ?? 0) + (s.supply_one_way_count ?? 0);
    if (sum !== 0 && sum < 1) {
      return jsonError(`route_supplies[${i}]: supply total must be >= 1 or both 0`);
    }

    if ((s.supply_round_trip_count ?? 0) > req.required_round_trip_count) {
      return jsonError(`route_supplies[${i}]: supply_round_trip_count exceeds required`);
    }
    if ((s.supply_one_way_count ?? 0) > req.required_one_way_count) {
      return jsonError(`route_supplies[${i}]: supply_one_way_count exceeds required`);
    }

    const p = route_prices[i];
    if (!p || p.route_id !== s.route_id) {
      return jsonError("route_prices must match route_supplies order and route_id");
    }

    const isNoSupply = (s.supply_round_trip_count ?? 0) === 0 && (s.supply_one_way_count ?? 0) === 0;
    if (isNoSupply) {
      if (p.round_trip_price != null || p.one_way_price != null) {
        return jsonError(`route_prices[${i}]: price must be null when supply is (0,0)`);
      }
    } else {
      hasAnySupply = true;
      if (p.round_trip_price == null || p.one_way_price == null) {
        return jsonError(`공급이 있는 노선에는 왕복·편도 가격이 모두 필요합니다. (노선 순서: ${i + 1})`);
      }
      if (p.round_trip_price < 0 || p.one_way_price < 0) {
        return jsonError(`route_prices[${i}]: price must be >= 0`);
      }
    }
  }

  if (!hasAnySupply) {
    return jsonError("At least one route must have non-zero supply", 400);
  }

  const { data: submission, error: subErr } = await supabase
    .from("rfq_supplier_submissions")
    .insert({
      rfq_id: rfqId,
      supplier_company_id: auth.company.id,
      submitted_by_user_id: auth.profile.id,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (subErr || !submission) {
    return jsonError(subErr?.message ?? "Failed to create submission", 500);
  }

  const supplyRows = route_supplies.map((s) => ({
    supplier_submission_id: submission.id,
    rfq_route_id: s.route_id,
    supply_round_trip_count: s.supply_round_trip_count ?? 0,
    supply_one_way_count: s.supply_one_way_count ?? 0,
    vehicle_year: s.vehicle_year ?? null,
  }));

  const priceRows = route_prices.map((p) => ({
    supplier_submission_id: submission.id,
    rfq_route_id: p.route_id,
    round_trip_price: p.round_trip_price,
    one_way_price: p.one_way_price,
  }));

  const [supplyRes, priceRes] = await Promise.all([
    supabase.from("rfq_supplier_route_supply").insert(supplyRows),
    supabase.from("rfq_supplier_route_prices").insert(priceRows),
  ]);

  if (supplyRes.error) return jsonError(supplyRes.error.message, 500);
  if (priceRes.error) return jsonError(priceRes.error.message, 500);

  return jsonSuccess({ id: submission.id }, 201);
}
