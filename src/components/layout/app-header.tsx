"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FileText, List, Shield, User } from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";

export function AppHeader() {
  const pathname = usePathname();
  const { user, company, isAdmin, loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <span className="text-muted-foreground">로딩 중...</span>
        </div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link href="/" className="text-xl font-semibold">
            셔틀 파트너 RFQ
          </Link>
          <Link href="/login">
            <Button>로그인</Button>
          </Link>
        </div>
      </header>
    );
  }

  const showRequesterSupplierNav = !isAdmin;

  return (
    <header className="border-b border-border bg-card px-6 py-3">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <Link href={isAdmin ? "/admin" : "/rfqs"} className="text-xl font-semibold">
          셔틀 파트너 RFQ
        </Link>
        <nav className="flex items-center gap-2">
          {showRequesterSupplierNav && (
            <>
              <Link href="/rfqs">
                <Button variant={pathname === "/rfqs" ? "secondary" : "ghost"} size="sm">
                  <FileText className="mr-1.5 size-4" />
                  RFQ 목록
                </Button>
              </Link>
              <Link href="/my">
                <Button variant={pathname === "/my" ? "secondary" : "ghost"} size="sm">
                  <List className="mr-1.5 size-4" />
                  My RFQ
                </Button>
              </Link>
              <NotificationDropdown />
            </>
          )}
          {isAdmin && (
            <Link href="/admin">
              <Button variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm">
                <Shield className="mr-1.5 size-4" />
                Admin
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="mr-1.5 size-4" />
                {company?.name ?? "프로필"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href="/mypage">마이페이지</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
