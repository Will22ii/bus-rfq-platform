import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { data: list, error } = await supabase
    .from("notifications")
    .select("id, notification_type, reference_id, created_at, is_read")
    .eq("recipient_user_id", auth.profile.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  const response = (list ?? []).map(
    (n: {
      id: string;
      notification_type: string;
      reference_id: string | null;
      created_at: string;
      is_read: boolean;
    }) => ({
      id: n.id,
      type: n.notification_type,
      reference_id: n.reference_id,
      created_at: n.created_at,
      is_read: n.is_read,
    })
  );

  return jsonSuccess(response);
}
