"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?redirect=/admin");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>
            일반 로그인 후 관리자 계정이면 Admin 메뉴가 보입니다. 리다이렉트 중…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login?redirect=/admin">
            <Button className="w-full">로그인 페이지로 이동</Button>
          </Link>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/rfqs" className="underline">일반 사용자 화면으로</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
