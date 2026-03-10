"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";

type Notif = { id: string; type: string; reference_id: string | null; created_at: string; is_read: boolean };

const TYPE_LABEL: Record<string, string> = {
  rfq_created: "RFQ 생성",
  quote_submitted: "견적 제출",
  rfq_cancelled: "RFQ 취소",
  rfq_completed: "RFQ 완료",
  supplier_selected: "공급사 선택",
};

export default function NotificationsPage() {
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Notif[]>("/notifications").then((r) => {
      if (r.data) setList(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">알림</h1>

      <Card>
        <CardHeader>
          <CardTitle>알림 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">불러오는 중...</p>}
          {!loading && list.length === 0 && <p className="text-muted-foreground">알림이 없습니다.</p>}
          {!loading && list.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>일시</TableHead>
                  <TableHead>읽음</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{TYPE_LABEL[n.type] ?? n.type}</TableCell>
                    <TableCell>{new Date(n.created_at).toLocaleString("ko-KR")}</TableCell>
                    <TableCell>{n.is_read ? "읽음" : "안 읽음"}</TableCell>
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
