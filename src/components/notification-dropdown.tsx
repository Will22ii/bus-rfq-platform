"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";

export type NotificationItem = {
  id: string;
  type: string;
  reference_id: string | null;
  created_at: string;
  is_read: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  rfq_created: "RFQ 생성",
  quote_submitted: "견적 제출",
  rfq_cancelled: "RFQ 취소",
  rfq_completed: "RFQ 완료",
  supplier_selected: "공급사 선택",
  quote_deadline_passed: "견적 마감 완료",
};

export function NotificationDropdown() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isNotificationsPage = pathname === "/notifications";

  const fetchCount = useCallback(async () => {
    const res = await api.get<{ count: number }>("/notifications?count_only=true");
    if (res.data != null) setUnreadCount(res.data.count);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const res = await api.get<NotificationItem[]>("/notifications");
    if (res.data != null) setList(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (open) {
      fetchList();
      fetchCount();
    }
  }, [open, fetchList, fetchCount]);

  const handleItemClick = useCallback(
    async (n: NotificationItem) => {
      if (n.is_read) return;
      const res = await api.patch<{ id: string; is_read: boolean }>(
        `/notifications/${n.id}`
      );
      if (res.data) {
        setList((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    },
    []
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isNotificationsPage ? "secondary" : "ghost"}
          size="sm"
          className="relative"
        >
          <Bell className="mr-1.5 size-4" />
          알림
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-0">
        <div className="max-h-[360px] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              불러오는 중...
            </div>
          )}
          {!loading && list.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              알림이 없습니다.
            </div>
          )}
          {!loading &&
            list.length > 0 &&
            list.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemClick(n);
                  }
                }}
                className={`cursor-pointer border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent/50 ${!n.is_read ? "font-medium" : "text-muted-foreground"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={n.is_read ? "font-normal" : ""}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="border-t border-border p-2">
          <Link
            href="/notifications"
            className="block rounded-md px-2 py-1.5 text-center text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            알림 전체 보기
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
