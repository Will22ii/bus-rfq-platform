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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RFQ 목록</h1>
        {canCreate && (
          <Link href="/rfqs/new">
            <Button>
              <Plus className="mr-2 size-4" />
              RFQ 생성
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>견적 요청 목록</CardTitle>
          <CardDescription>최신 생성 순으로 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">불러오는 중...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && list.length === 0 && (
            <p className="text-muted-foreground">RFQ가 없습니다.</p>
          )}
          {!loading && !error && list.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ 제목</TableHead>
                  <TableHead>행사장</TableHead>
                  <TableHead>견적 마감일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((rfq) => (
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
                        <Button variant="ghost" size="sm">
                          상세
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
