"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";

const PUBLIC_PATHS = ["/login", "/admin-login"];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (pathname === "/admin") {
        router.replace("/login?redirect=/admin");
        return;
      }
      if (!PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) {
        router.replace("/login");
      }
      return;
    }
    if (pathname === "/login" || pathname === "/admin-login") {
      router.replace(isAdmin ? "/admin" : "/rfqs");
      return;
    }
    if (isAdmin && pathname !== "/admin") {
      router.replace("/admin");
    }
  }, [user, isAdmin, loading, pathname, router]);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user && pathname?.startsWith("/login")) {
    return <>{children}</>;
  }
  if (!user && pathname?.startsWith("/admin-login")) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  if (user && (pathname === "/login" || pathname === "/admin-login")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">이동 중...</p>
      </div>
    );
  }
  if (user && isAdmin && pathname !== "/admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">이동 중...</p>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
