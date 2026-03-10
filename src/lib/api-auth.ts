import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export type Company = {
  id: string;
  name: string;
  can_request: boolean;
  can_supply: boolean;
  is_active: boolean;
};

export type UserProfile = {
  id: string;
  auth_user_id: string;
  company_id: string;
  public_phone: string | null;
  phone_consent_agreed: boolean;
  is_admin: boolean;
  company?: Company;
};

export type AuthResult = {
  userId: string;
  profile: UserProfile;
  company: Company;
};

function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function getAuthFromRequest(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return { error: jsonError("Missing or invalid Authorization header", 401) };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { error: jsonError("Invalid or expired session", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, company_id, public_phone, phone_consent_agreed, is_admin")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: jsonError("User profile not found", 403) };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, can_request, can_supply, is_active")
    .eq("id", profile.company_id)
    .single();

  if (companyError || !company) {
    return { error: jsonError("Company not found", 403) };
  }

  if (!company.is_active) {
    return { error: jsonError("Company is inactive", 403) };
  }

  const is_admin = profile.is_admin === true;

  return {
    auth: {
      userId: user.id,
      profile: { ...profile, company, is_admin },
      company,
    },
  };
}

/** Requires admin role (user_profiles.is_admin). */
export async function requireAdmin(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const result = await getAuthFromRequest(request);
  if ("error" in result) return result;
  if (!result.auth.profile.is_admin) {
    return { error: jsonError("Admin permission required", 403) };
  }
  return result;
}

/** Requires valid session; returns auth or 401/403 response. */
export async function requireAuth(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  return getAuthFromRequest(request);
}

/** Requires requester role (can_request). */
export async function requireRequester(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const result = await getAuthFromRequest(request);
  if ("error" in result) return result;
  if (!result.auth.company.can_request) {
    return { error: jsonError("Requester permission required", 403) };
  }
  return result;
}

/** Requires supplier role (can_supply). */
export async function requireSupplier(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const result = await getAuthFromRequest(request);
  if ("error" in result) return result;
  if (!result.auth.company.can_supply) {
    return { error: jsonError("Supplier permission required", 403) };
  }
  return result;
}

/** Requester or Supplier (any authenticated user with at least one role). */
export async function requireRequesterOrSupplier(
  request: NextRequest
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const result = await getAuthFromRequest(request);
  if ("error" in result) return result;
  if (!result.auth.company.can_request && !result.auth.company.can_supply) {
    return { error: jsonError("Requester or Supplier permission required", 403) };
  }
  return result;
}
