import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if ("error" in authResult) return authResult.error;

  const { data: rfqs, error } = await supabase
    .from("rfqs")
    .select(`
      id,
      title,
      concert_name,
      venue,
      status,
      quote_deadline_at,
      created_at,
      companies ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  const list = (rfqs ?? []).map((r: { companies?: { name: string } | null; [k: string]: unknown }) => ({
    id: r.id,
    title: r.title,
    concert_name: r.concert_name,
    venue: r.venue,
    status: r.status,
    quote_deadline_at: r.quote_deadline_at,
    created_at: r.created_at,
    requester_company_name: r.companies && typeof r.companies === "object" && "name" in r.companies ? (r.companies as { name: string }).name : null,
  }));

  return jsonSuccess(list);
}
