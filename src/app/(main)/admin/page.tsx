"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

type Stats = {
  total: number;
  completedCount: number;
  successRfqCount: number;
  failRfqCount: number;
  rfqSuccessRatePercent: number | null;
  routeTotal: number;
  routeSelectedCount: number;
  routeSuccessRatePercent: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      setLoading(false);
      return;
    }
    if (!authLoading && user && isAdmin) {
      api.get<Stats>("/admin/stats").then((res) => {
        if (res.data) setStats(res.data);
        if (res.error) setError(res.error);
        setLoading(false);
      });
    }
  }, [authLoading, user, isAdmin, router]);

  if (authLoading || (user && isAdmin && loading && !stats)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">관리자 통계</h1>
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">관리자</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">관리자 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">관리자 통계</h1>
      <p className="text-muted-foreground">문서 13절 기준 Success/Fail 통계입니다.</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 RFQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">건</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">완료 RFQ 성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.rfqSuccessRatePercent != null ? `${stats.rfqSuccessRatePercent}%` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">
              Success {stats?.successRfqCount ?? 0} / Fail {stats?.failRfqCount ?? 0} (완료 {stats?.completedCount ?? 0}건)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">노선별 성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.routeSuccessRatePercent != null ? `${stats.routeSuccessRatePercent}%` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">
              선택된 노선 {stats?.routeSelectedCount ?? 0} / 전체 노선 {stats?.routeTotal ?? 0} (완료 RFQ 기준)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">완료 RFQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.completedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">선택 완료 상태 건수</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
