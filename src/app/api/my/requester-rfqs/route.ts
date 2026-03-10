import { NextRequest } from "next/server";
import { requireRequester } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const authResult = await requireRequester(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { data: list, error } = await supabase
    .from("rfqs")
    .select("id, title, concert_name, venue, status, quote_deadline_at, created_at")
    .eq("requester_company_id", auth.company.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return jsonSuccess(list ?? []);
}
