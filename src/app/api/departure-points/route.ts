import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const { data, error } = await supabase
    .from("departure_points")
    .select("id, name, region")
    .order("name");

  if (error) return jsonError(error.message, 500);
  return jsonSuccess(data ?? []);
}
