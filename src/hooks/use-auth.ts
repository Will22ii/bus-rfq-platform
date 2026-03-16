"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type Company = {
  id: string;
  name: string;
  can_request: boolean;
  can_supply: boolean;
  is_active: boolean;
};

export type Profile = {
  id: string;
  company_id: string;
  public_phone: string | null;
  phone_consent_agreed: boolean;
};

export type AuthState = {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  isAdmin: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    let session: { user?: unknown; access_token?: string } | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session ?? null;
    } catch (e) {
      // Failed to fetch / AuthRetryableFetchError: 네트워크 불가, Supabase URL 오류, CORS 등
      setUser(null);
      setProfile(null);
      setCompany(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (!session?.user) {
      setUser(null);
      setProfile(null);
      setCompany(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setUser(session.user as import("@supabase/supabase-js").User);
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${(session as { access_token?: string }).access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data) {
      setProfile(json.data.profile);
      setCompany(json.data.company);
      setIsAdmin(!!json.data.isAdmin);
    } else {
      setProfile(null);
      setCompany(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMe();
    let sub: { unsubscribe: () => void } | undefined;
    try {
      const out = supabase.auth.onAuthStateChange(() => {
        fetchMe();
      });
      sub = out?.data?.subscription;
    } catch {
      // auth 초기화/연결 실패 시 구독 없이 종료
    }
    return () => sub?.unsubscribe?.();
  }, [fetchMe]);

  return { user, profile, company, isAdmin, loading, refetch: fetchMe };
}
