import { supabase } from "@/lib/supabase/client";

async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    // Failed to fetch / AuthRetryableFetchError: 네트워크·Supabase 연결 실패 시 로그인 없음으로 처리
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = await getAccessToken();
  if (!token) {
    return { error: "로그인이 필요합니다.", status: 401 };
  }
  const base = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = path.startsWith("http") ? path : `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: (json as { message?: string }).message ?? "요청에 실패했습니다.",
      status: res.status,
    };
  }
  return {
    data: (json as { data?: T }).data,
    status: res.status,
  };
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
