"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

type RequesterRfq = { id: string; title: string; concert_name: string; venue: string; status: string; quote_deadline_at: string; created_at: string };
type SupplierRfq = { id: string; rfq_id: string; submitted_at: string; rfq?: { id: string; title: string; venue: string; status: string; quote_deadline_at: string } };

export default function MyRfqPage() {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My RFQ</h1>

      <Tabs value={tabValue} onValueChange={setActiveTab}>
        <TabsList>
          {canRequest && <TabsTrigger value="requester">내가 생성한 RFQ</TabsTrigger>}
          {canSupply && <TabsTrigger value="supplier">내가 제출한 RFQ</TabsTrigger>}
        </TabsList>

        {canRequest && (
          <TabsContent value="requester">
            <Card>
              <CardHeader>
                <CardTitle>내가 생성한 RFQ</CardTitle>
                <CardDescription>요청사로 생성한 견적 요청 목록입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReq && <p className="text-muted-foreground">불러오는 중...</p>}
                {!loadingReq && requesterList.length === 0 && (
                  <p className="text-muted-foreground">생성한 RFQ가 없습니다.</p>
                )}
                {!loadingReq && requesterList.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제목</TableHead>
                        <TableHead>행사장</TableHead>
                        <TableHead>견적 마감일</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requesterList.map((rfq) => (
                        <TableRow key={rfq.id}>
                          <TableCell className="font-medium">{rfq.title}</TableCell>
                          <TableCell>{rfq.venue}</TableCell>
                          <TableCell>
                            {new Date(rfq.quote_deadline_at).toLocaleDateString("ko-KR")}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rfq.status} />
                          </TableCell>
                          <TableCell>
                            <Link href={`/rfqs/${rfq.id}`}>
                              <Button variant="ghost" size="sm">상세</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canSupply && (
          <TabsContent value="supplier">
            <Card>
              <CardHeader>
                <CardTitle>내가 제출한 RFQ</CardTitle>
                <CardDescription>공급사로 견적을 제출한 RFQ 목록입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSup && <p className="text-muted-foreground">불러오는 중...</p>}
                {!loadingSup && supplierList.length === 0 && (
                  <p className="text-muted-foreground">제출한 RFQ가 없습니다.</p>
                )}
                {!loadingSup && supplierList.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFQ 제목</TableHead>
                        <TableHead>행사장</TableHead>
                        <TableHead>제출일시</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierList.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.rfq?.title ?? "-"}</TableCell>
                          <TableCell>{s.rfq?.venue ?? "-"}</TableCell>
                          <TableCell>
                            {new Date(s.submitted_at).toLocaleString("ko-KR")}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={s.rfq?.status ?? "open"} />
                            <span className="ml-2 text-xs text-muted-foreground">제출 완료</span>
                          </TableCell>
                          <TableCell>
                            <Link href={`/rfqs/${s.rfq_id}`}>
                              <Button variant="ghost" size="sm">상세</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
