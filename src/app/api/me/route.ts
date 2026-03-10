import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const { auth } = authResult;
  return jsonSuccess({
    profile: {
      id: auth.profile.id,
      company_id: auth.profile.company_id,
      public_phone: auth.profile.public_phone,
      phone_consent_agreed: auth.profile.phone_consent_agreed,
    },
    company: auth.company,
    isAdmin: auth.profile.is_admin === true,
  });
}
