"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export default function MypagePage() {
  const { profile, company } = useAuth();
  const [phone, setPhone] = useState(profile?.public_phone ?? "");
  const [saved, setSaved] = useState(false);

  if (!profile || !company) return <p className="text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">마이페이지</h1>

      <Card>
        <CardHeader>
          <CardTitle>회사 정보</CardTitle>
          <CardDescription>로그인된 계정의 회사 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="text-muted-foreground">회사명:</span> {company.name}</p>
          <p className="text-sm text-muted-foreground">
            {company.can_request && "요청사(Requester) "}
            {company.can_supply && "공급사(Supplier)"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>공개 전화번호</CardTitle>
          <CardDescription>RFQ 낙찰 시 요청사에게 공개됩니다. 전화번호 입력 시 개인정보 수집에 동의한 것으로 간주됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
          <Button onClick={() => setSaved(true)}>저장 (API 연동 예정)</Button>
          {saved && <p className="text-sm text-muted-foreground">저장되었습니다. (실제 저장은 API 연동 후 적용됩니다)</p>}
        </CardContent>
      </Card>
    </div>
  );
}
