/**
 * 알림 생성·수신자 조회 (docs/15_notification_plan.md)
 * 서버 전용: API route에서만 사용.
 */
import { supabase } from "@/lib/supabase/client";

export type NotificationType =
  | "rfq_created"
  | "quote_submitted"
  | "rfq_cancelled"
  | "rfq_completed"
  | "supplier_selected"
  | "quote_deadline_passed";

/** 단일 알림 INSERT. 실패 시 에러 로깅만 하고 throw하지 않음(비동기 알림이 메인 플로우를 막지 않도록). */
export async function createNotification(
  recipientUserId: string,
  notificationType: NotificationType,
  referenceId: string | null
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: recipientUserId,
    notification_type: notificationType,
    reference_id: referenceId,
  });
  if (error) {
    console.error("[notifications] createNotification failed:", error.message);
  }
}

/** company_id 1개 → 해당 회사의 user_profiles.id 1명 (UNIQUE(company_id) 보장). */
export async function getRecipientUserIdByCompanyId(
  companyId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();
  return data?.id ?? null;
}

/** 여러 company_id → 각 회사별 user_profiles.id 목록 (중복 제거). */
export async function getRecipientUserIdsByCompanyIds(
  companyIds: string[]
): Promise<string[]> {
  if (companyIds.length === 0) return [];
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .in("company_id", [...new Set(companyIds)]);
  return (data ?? []).map((r) => r.id);
}

/** quote_deadline_passed 중복 방지: 이미 (recipient, rfq_id) 조합으로 알림이 있으면 true */
export async function hasQuoteDeadlinePassedNotification(
  recipientUserId: string,
  rfqId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_user_id", recipientUserId)
    .eq("notification_type", "quote_deadline_passed")
    .eq("reference_id", rfqId)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data != null;
}

/** 한 RFQ가 open→in_review로 바뀐 직후, requester + 해당 RFQ에 견적 제출한 supplier들에게 quote_deadline_passed 알림 생성 (중복 시 스킵). */
export async function createQuoteDeadlinePassedNotificationsForRfq(
  rfqId: string,
  requesterCompanyId: string,
  supplierCompanyIds: string[]
): Promise<void> {
  const requesterUserId = await getRecipientUserIdByCompanyId(requesterCompanyId);
  const supplierUserIds = await getRecipientUserIdsByCompanyIds(supplierCompanyIds);
  const allUserIds = [
    ...(requesterUserId ? [requesterUserId] : []),
    ...supplierUserIds,
  ];
  for (const uid of allUserIds) {
    const exists = await hasQuoteDeadlinePassedNotification(uid, rfqId);
    if (!exists) {
      await createNotification(uid, "quote_deadline_passed", rfqId);
    }
  }
}
