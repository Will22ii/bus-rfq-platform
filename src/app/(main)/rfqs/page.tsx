"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { Plus } from "lucide-react";

type RfqItem = {
  id: string;
  title: string;
  concert_name: string;
  venue: string;
  status: string;
  quote_deadline_at: string;
};

export default function RfqListPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [list, setList] = useState<RfqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<RfqItem[]>("/rfqs").then((res) => {
      if (res.error) setError(res.error);
      else if (res.data) setList(res.data);
      setLoading(false);
    });
  }, []);

  const canCreate = company?.can_request ?? false;

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-6">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">RFQ 목록</h1>
          {canCreate && (
            <Link href="/rfqs/new">
              <Button size="lg">
                <Plus className="mr-2 size-4" />
                RFQ 생성
              </Button>
            </Link>
          )}
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle>견적 요청 목록</CardTitle>
            <CardDescription>최신 생성 순으로 표시됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {loading && (
              <p className="py-6 text-center text-base text-muted-foreground">불러오는 중...</p>
            )}
            {error && (
              <p className="py-6 text-center text-base text-destructive">{error}</p>
            )}
            {!loading && !error && list.length === 0 && (
              <p className="py-6 text-center text-base text-muted-foreground">RFQ가 없습니다.</p>
            )}
            {!loading && !error && list.length > 0 && (
              <div className="flex flex-col gap-3">
                {list.map((rfq) => (
                  <Card
                    key={rfq.id}
                    className="flex min-h-[88px] cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/rfqs/${rfq.id}`)}
                  >
                    <CardContent className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <p className="text-xl font-medium leading-tight">{rfq.title}</p>
                        <p className="text-base text-muted-foreground">
                          {rfq.venue} · {new Date(rfq.quote_deadline_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <StatusBadge status={rfq.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
