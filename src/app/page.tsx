"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace(isAdmin ? "/admin" : "/rfqs");
    else router.replace("/login");
  }, [user, isAdmin, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">이동 중...</p>
    </div>
  );
}
