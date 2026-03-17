import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;

  const { id } = await params;
  if (!id) return jsonError("Notification id required", 400);

  const { data: row, error: fetchErr } = await supabase
    .from("notifications")
    .select("id, recipient_user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !row) return jsonError("Notification not found", 404);
  if (row.recipient_user_id !== auth.profile.id) {
    return jsonError("Forbidden", 403);
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", id);

  if (updErr) return jsonError(updErr.message, 500);
  return jsonSuccess({ id, is_read: true, read_at: now });
}
