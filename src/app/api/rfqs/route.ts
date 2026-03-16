import { NextRequest } from "next/server";
import { requireRequester, requireRequesterOrSupplier } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

const MAX_QUOTE_DAYS = 5;

type RouteInput = {
  departure_point_id: string;
  destination: string;
  arrival_time_round1?: string;
  arrival_time_round2?: string;
  return_departure_time?: string;
  bus_type: "44_seat" | "31_seat" | "28_seat";
  required_round_trip_count: number;
  required_one_way_count: number;
};

type DateInput = {
  service_date: string;
  routes: RouteInput[];
};

type CreateRfqBody = {
  title: string;
  concert_name?: string;
  venue: string;
  quote_deadline_at: string;
  dates: DateInput[];
};

export async function POST(request: NextRequest) {
  const authResult = await requireRequester(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  let body: CreateRfqBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { title, concert_name, venue, quote_deadline_at, dates } = body;
  if (
    !title ||
    !venue ||
    !quote_deadline_at ||
    !Array.isArray(dates) ||
    dates.length === 0
  ) {
    return jsonError("title, venue, quote_deadline_at, dates are required");
  }
  // DB rfqs.concert_name is NOT NULL: use venue when client omits concert_name; fallback "" so we never pass undefined
  const concertNameForDb = concert_name?.trim() || venue.trim() || "";

  const deadline = new Date(quote_deadline_at);
  if (Number.isNaN(deadline.getTime())) {
    return jsonError("Invalid quote_deadline_at");
  }
  const now = new Date();
  if (deadline <= now) {
    return jsonError("quote_deadline_at must be in the future");
  }
  const maxDeadline = new Date();
  maxDeadline.setDate(maxDeadline.getDate() + MAX_QUOTE_DAYS);
  if (deadline > maxDeadline) {
    return jsonError("quote_deadline_at must be within 5 days from now");
  }

  const allDeparturePointIds = new Set<string>();
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d.service_date || !Array.isArray(d.routes) || d.routes.length === 0) {
      return jsonError(`dates[${i}]: service_date and non-empty routes required`);
    }
    const serviceDate = new Date(d.service_date);
    if (Number.isNaN(serviceDate.getTime())) {
      return jsonError(`dates[${i}]: invalid service_date`);
    }
    for (let j = 0; j < d.routes.length; j++) {
      const r = d.routes[j];
      if (!r.departure_point_id || typeof r.departure_point_id !== "string") {
        return jsonError(`dates[${i}].routes[${j}]: departure_point_id required`);
      }
      if (typeof r.destination !== "string" || !r.destination.trim()) {
        return jsonError(`dates[${i}].routes[${j}]: destination required`);
      }
      allDeparturePointIds.add(r.departure_point_id);
      if (
        r.required_round_trip_count < 0 ||
        r.required_one_way_count < 0
      ) {
        return jsonError(
          `dates[${i}].routes[${j}]: required_round_trip_count and required_one_way_count must be >= 0`
        );
      }
      if (!["44_seat", "31_seat", "28_seat"].includes(r.bus_type ?? "")) {
        return jsonError(`dates[${i}].routes[${j}]: invalid bus_type`);
      }
    }
  }
  if (allDeparturePointIds.size > 0) {
    const { data: existingDp } = await supabase
      .from("departure_points")
      .select("id")
      .in("id", [...allDeparturePointIds]);
    const foundIds = new Set((existingDp ?? []).map((row: { id: string }) => row.id));
    const missing = [...allDeparturePointIds].filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return jsonError(`Invalid departure_point_id: ${missing.join(", ")}`);
    }
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .insert({
      title,
      concert_name: concertNameForDb,
      venue,
      requester_company_id: auth.company.id,
      created_by_user_id: auth.profile.id,
      status: "open",
      quote_deadline_at: quote_deadline_at,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (rfqError || !rfq) {
    return jsonError(rfqError?.message ?? "Failed to create RFQ", 500);
  }

  const rfqId = rfq.id;
  const sortOrderDates: number[] = [];

  for (let i = 0; i < dates.length; i++) {
    const { data: rd, error: dateError } = await supabase
      .from("rfq_dates")
      .insert({
        rfq_id: rfqId,
        service_date: dates[i].service_date,
        sort_order: i,
      })
      .select("id")
      .single();

    if (dateError || !rd) {
      return jsonError(dateError?.message ?? "Failed to create RFQ date", 500);
    }

    const routeRows: { rfq_date_id: string; departure_point_id: string; destination: string; arrival_time_round1?: string; arrival_time_round2?: string; return_departure_time?: string; bus_type: string; required_round_trip_count: number; required_one_way_count: number; sort_order: number }[] = [];
    dates[i].routes.forEach((r: RouteInput, j: number) => {
      routeRows.push({
        rfq_date_id: rd.id,
        departure_point_id: r.departure_point_id,
        destination: r.destination,
        arrival_time_round1: r.arrival_time_round1,
        arrival_time_round2: r.arrival_time_round2,
        return_departure_time: r.return_departure_time,
        bus_type: r.bus_type,
        required_round_trip_count: r.required_round_trip_count,
        required_one_way_count: r.required_one_way_count,
        sort_order: j,
      });
    });

    const { data: routesData, error: routesError } = await supabase
      .from("rfq_routes")
      .insert(routeRows)
      .select("id");

    if (routesError || !routesData?.length) {
      return jsonError(routesError?.message ?? "Failed to create RFQ routes", 500);
    }

    const selectionRows = routesData.map((row: { id: string }) => ({
      rfq_route_id: row.id,
      selection_status: "none",
    }));

    const { error: selError } = await supabase
      .from("rfq_route_selections")
      .insert(selectionRows);

    if (selError) {
      return jsonError(selError.message ?? "Failed to create route selections", 500);
    }
  }

  return jsonSuccess({ id: rfqId }, 201);
}

export async function GET(request: NextRequest) {
  const authResult = await requireRequesterOrSupplier(request);
  if ("error" in authResult) return authResult.error;

  const now = new Date().toISOString();

  await supabase
    .from("rfqs")
    .update({ status: "in_review", review_started_at: now })
    .eq("status", "open")
    .lt("quote_deadline_at", now);

  const { data: openOrReview, error: e1 } = await supabase
    .from("rfqs")
    .select("id, title, concert_name, venue, status, quote_deadline_at, created_at")
    .in("status", ["open", "in_review"])
    .order("created_at", { ascending: false });

  if (e1) return jsonError(e1.message, 500);

  const { data: completedOrCancelled, error: e2 } = await supabase
    .from("rfqs")
    .select("id, title, concert_name, venue, status, quote_deadline_at, created_at")
    .in("status", ["completed", "cancelled"])
    .gte("list_visible_until_at", now)
    .not("list_visible_until_at", "is", null)
    .order("created_at", { ascending: false });

  if (e2) return jsonError(e2.message, 500);

  const combined = [...(openOrReview ?? []), ...(completedOrCancelled ?? [])];
  combined.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const list = combined.map(
    ({ id, title, concert_name, venue, status, quote_deadline_at }) => ({
      id,
      title,
      concert_name,
      venue,
      status,
      quote_deadline_at,
    })
  );

  return jsonSuccess(list);
}
