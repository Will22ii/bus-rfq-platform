"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

type RequesterRfq = { id: string; title: string; concert_name: string; venue: string; status: string; quote_deadline_at: string; created_at: string };
type SupplierRfq = { id: string; rfq_id: string; submitted_at: string; rfq?: { id: string; title: string; venue: string; status: string; quote_deadline_at: string } };

export default function MyRfqPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [requesterList, setRequesterList] = useState<RequesterRfq[]>([]);
  const [supplierList, setSupplierList] = useState<SupplierRfq[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingSup, setLoadingSup] = useState(true);

  const canRequest = company?.can_request ?? false;
  const canSupply = company?.can_supply ?? false;

  const [activeTab, setActiveTab] = useState<string>("requester");

  useEffect(() => {
    setActiveTab((prev) => {
      if (prev === "requester" && !canRequest) return "supplier";
      if (prev === "supplier" && !canSupply) return "requester";
      return prev;
    });
  }, [canRequest, canSupply]);

  const tabValue = canRequest && canSupply ? activeTab : canRequest ? "requester" : "supplier";

  useEffect(() => {
    if (canRequest) {
      api.get<RequesterRfq[]>("/my/requester-rfqs").then((r) => {
        if (r.data) setRequesterList(r.data);
        setLoadingReq(false);
      });
    } else setLoadingReq(false);
  }, [canRequest]);

  useEffect(() => {
    if (canSupply) {
      api.get<SupplierRfq[]>("/my/supplier-rfqs").then((r) => {
        if (r.data) setSupplierList(r.data);
        setLoadingSup(false);
      });
    } else setLoadingSup(false);
  }, [canSupply]);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-6">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">My RFQ</h1>

        <Tabs value={tabValue} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full">
            {canRequest && <TabsTrigger value="requester">내가 생성한 RFQ</TabsTrigger>}
            {canSupply && <TabsTrigger value="supplier">내가 제출한 RFQ</TabsTrigger>}
          </TabsList>

          {canRequest && (
            <TabsContent value="requester" className="mt-0">
              <Card className="w-full">
                <CardHeader className="space-y-1.5 pb-4">
                  <CardTitle>내가 생성한 RFQ</CardTitle>
                  <CardDescription>생성한 견적 요청 목록입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {loadingReq && (
                    <p className="py-6 text-center text-base text-muted-foreground">불러오는 중...</p>
                  )}
                  {!loadingReq && requesterList.length === 0 && (
                    <p className="py-6 text-center text-base text-muted-foreground">생성한 RFQ가 없습니다.</p>
                  )}
                  {!loadingReq && requesterList.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {requesterList.map((rfq) => (
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
            </TabsContent>
          )}

          {canSupply && (
            <TabsContent value="supplier" className="mt-0">
              <Card className="w-full">
                <CardHeader className="space-y-1.5 pb-4">
                  <CardTitle>내가 제출한 RFQ</CardTitle>
                  <CardDescription>견적을 제출한 RFQ 목록입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {loadingSup && (
                    <p className="py-6 text-center text-base text-muted-foreground">불러오는 중...</p>
                  )}
                  {!loadingSup && supplierList.length === 0 && (
                    <p className="py-6 text-center text-base text-muted-foreground">제출한 RFQ가 없습니다.</p>
                  )}
                  {!loadingSup && supplierList.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {supplierList.map((s) => (
                        <Card
                          key={s.id}
                          className="flex min-h-[88px] cursor-pointer transition-colors hover:bg-muted/50"
                          onClick={() => router.push(`/rfqs/${s.rfq_id}`)}
                        >
                          <CardContent className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
                            <div className="flex min-w-0 flex-col gap-1.5">
                              <p className="text-xl font-medium leading-tight">{s.rfq?.title ?? "-"}</p>
                              <p className="text-base text-muted-foreground">
                                {s.rfq?.venue ?? "-"} · {new Date(s.submitted_at).toLocaleDateString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge status={s.rfq?.status ?? "open"} />
                              <span className="text-sm text-muted-foreground">제출 완료</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
