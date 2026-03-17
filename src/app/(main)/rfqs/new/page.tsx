"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import {
  RFQBasicInfo,
  ServiceDateSelector,
  ScheduleGroupEditor,
  RouteSelector,
  RFQRouteRequirementTable,
  type Schedule,
  type DeparturePoint,
  type RouteRequirement,
  type ScheduleTimes,
} from "@/components/rfq-create";
import { ArrowLeft, ChevronRight } from "lucide-react";

function getScheduleForDate(schedules: Schedule[], date: string): Schedule | undefined {
  return schedules.find((s) => s.assignedDates.includes(date));
}

function scheduleToTimes(schedule: Schedule): ScheduleTimes {
  return {
    arrivalTimeRound1: schedule.arrivalTimeRound1,
    arrivalTimeRound2: schedule.arrivalTimeRound2,
    ...(schedule.roundCount >= 3 && { arrivalTimeRound3: schedule.arrivalTimeRound3 }),
    returnDepartureTime: schedule.returnDepartureTime,
  };
}

const defaultRequirement = (): RouteRequirement => ({
  bus_type: "44_seat",
  required_round_trip_count: 0,
  required_one_way_count: 0,
});

export default function RfqNewPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [step, setStep] = useState(1);
  const [departurePoints, setDeparturePoints] = useState<DeparturePoint[]>([]);

  // Step 1
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [quoteDeadlineAt, setQuoteDeadlineAt] = useState("");
  const [serviceDates, setServiceDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDeparturePointIds, setSelectedDeparturePointIds] = useState<string[]>([]);

  // Step 2: per (date, departure_point_id) -> RouteRequirement
  const [routeRequirements, setRouteRequirements] = useState<
    Record<string, Record<string, RouteRequirement>>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate = company?.can_request ?? false;

  useEffect(() => {
    if (!canCreate) return;
    api.get<DeparturePoint[]>("/departure-points").then((r) => {
      if (r.data) setDeparturePoints(r.data);
    });
  }, [canCreate]);

  const addDate = () => {
    if (!dateInput.trim()) return;
    const d = dateInput.trim();
    if (!serviceDates.includes(d)) setServiceDates((prev) => [...prev, d].sort());
    setDateInput("");
  };

  const removeDate = (d: string) => {
    setServiceDates((prev) => prev.filter((x) => x !== d));
    setSchedules((prev) =>
      prev
        .map((s) => ({
          ...s,
          assignedDates: s.assignedDates.filter((x) => x !== d),
        }))
        .filter((s) => s.assignedDates.length > 0)
    );
  };

  const allDatesAssigned =
    serviceDates.length > 0 &&
    serviceDates.every((d) => schedules.some((s) => s.assignedDates.includes(d)));
  const noDateInMultipleSchedules = serviceDates.every((d) => {
    const count = schedules.filter((s) => s.assignedDates.includes(d)).length;
    return count <= 1;
  });
  const everyScheduleHasTimes = schedules.every(
    (s) => s.arrivalTimeRound1 && s.returnDepartureTime
  );

  // 1단계 실시간 검증: 견적 마감일이 비어있지 않을 때, 과거 또는 5일 초과면 붉은색 ALERT (브라우저 로컬 시간 기준, 한국에서는 KST)
  const deadlineError = useMemo(() => {
    if (!quoteDeadlineAt.trim()) return "";
    const now = new Date();
    const deadline = new Date(quoteDeadlineAt);
    if (Number.isNaN(deadline.getTime())) return "";
    if (deadline.getTime() <= now.getTime()) {
      return "견적 마감일은 현재 시점 이후여야 합니다.";
    }
    const fiveDaysLater = new Date(now);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    if (deadline.getTime() > fiveDaysLater.getTime()) {
      return "견적 마감일은 오늘부터 5일 이내여야 합니다.";
    }
    return "";
  }, [quoteDeadlineAt]);

  const canGoStep2 =
    title.trim() &&
    venue.trim() &&
    quoteDeadlineAt &&
    !deadlineError &&
    serviceDates.length > 0 &&
    schedules.length > 0 &&
    allDatesAssigned &&
    noDateInMultipleSchedules &&
    everyScheduleHasTimes &&
    selectedDeparturePointIds.length > 0;

  const goToStep2 = () => {
    const initial: Record<string, Record<string, RouteRequirement>> = {};
    serviceDates.forEach((date) => {
      initial[date] = {};
      selectedDeparturePointIds.forEach((depId) => {
        initial[date][depId] = defaultRequirement();
      });
    });
    setRouteRequirements(initial);
    setStep(2);
  };

  const setRequirement = (
    date: string,
    departurePointId: string,
    field: keyof RouteRequirement,
    value: string | number
  ) => {
    setRouteRequirements((prev) => {
      const next = { ...prev };
      if (!next[date]) next[date] = {};
      next[date] = { ...next[date], [departurePointId]: { ...(next[date][departurePointId] ?? defaultRequirement()), [field]: value } };
      return next;
    });
  };

  const buildPayload = () => {
    const deadline = new Date(quoteDeadlineAt);
    const dates = serviceDates.map((service_date) => {
      const schedule = getScheduleForDate(schedules, service_date);
      if (!schedule) return { service_date, routes: [] };
      const times = scheduleToTimes(schedule);
      const routes = selectedDeparturePointIds.map((departure_point_id) => {
        const req = routeRequirements[service_date]?.[departure_point_id] ?? defaultRequirement();
        return {
          departure_point_id,
          destination: venue.trim(),
          arrival_time_round1: times.arrivalTimeRound1 || undefined,
          arrival_time_round2: times.arrivalTimeRound2 || undefined,
          return_departure_time: times.returnDepartureTime || undefined,
          bus_type: req.bus_type,
          required_round_trip_count: req.required_round_trip_count,
          required_one_way_count: req.required_one_way_count,
        };
      });
      return { service_date, routes };
    });
    return {
      title: title.trim(),
      venue: venue.trim(),
      quote_deadline_at: deadline.toISOString(),
      dates,
    };
  };

  const handleCreate = async () => {
    setError("");
    const deadline = new Date(quoteDeadlineAt);
    if (Number.isNaN(deadline.getTime())) {
      setError("견적 마감일을 올바르게 입력해 주세요.");
      return;
    }
    const now = new Date();
    if (deadline <= now) {
      setError("견적 마감일은 미래 시점이어야 합니다.");
      return;
    }
    const maxDeadline = new Date();
    maxDeadline.setDate(maxDeadline.getDate() + 5);
    if (deadline > maxDeadline) {
      setError("견적 마감일은 오늘로부터 5일 이내여야 합니다.");
      return;
    }
    setSubmitting(true);
    const payload = buildPayload();
    const res = await api.post<{ id: string }>("/rfqs", payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data?.id) router.push(`/rfqs/${res.data.id}`);
  };

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">RFQ 생성 권한이 없습니다.</p>
        <Link href="/rfqs">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rfqs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">RFQ 생성</h1>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className={step === 1 ? "font-semibold text-foreground" : "text-muted-foreground"}>
          1단계 기본 정보
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className={step === 2 ? "font-semibold text-foreground" : "text-muted-foreground"}>
          2단계 노선 요건
        </span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1단계: 기본 정보 및 운행 스케줄</CardTitle>
            <CardDescription>
              제목, 행사장, 견적 마감, 운행 날짜, 스케줄, 노선(출발지)을 입력하세요. 도착지는 행사장으로 동일 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md space-y-6">
              <RFQBasicInfo
                title={title}
                venue={venue}
                quoteDeadlineAt={quoteDeadlineAt}
                deadlineError={deadlineError || undefined}
                onTitleChange={setTitle}
                onVenueChange={setVenue}
                onQuoteDeadlineAtChange={setQuoteDeadlineAt}
              />
              <ServiceDateSelector
                selectedDates={serviceDates}
                dateInput={dateInput}
                onDateInputChange={setDateInput}
                onAddDate={addDate}
                onRemoveDate={removeDate}
              />
            </div>
            <ScheduleGroupEditor
              schedules={schedules}
              serviceDates={serviceDates}
              onSchedulesChange={setSchedules}
            />
            <RouteSelector
              departurePoints={departurePoints}
              selectedIds={selectedDeparturePointIds}
              onSelectedIdsChange={setSelectedDeparturePointIds}
            />
            {!allDatesAssigned && serviceDates.length > 0 && (
              <p className="text-sm text-destructive">
                모든 운행 날짜를 스케줄에 배정해 주세요. 각 날짜는 하나의 스케줄에만 포함되어야 합니다.
              </p>
            )}
            <Button onClick={goToStep2} disabled={!canGoStep2}>
              다음: 2단계 노선 요건 입력
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2단계: 날짜별 노선 요건</CardTitle>
            <CardDescription>
              각 날짜 탭에서 버스 타입과 필요 대수를 입력하세요. 도착·귀가 시간은 1단계 스케줄에서 자동 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue={serviceDates[0] ?? ""}>
              <TabsList>
                {serviceDates.map((d) => (
                  <TabsTrigger key={d} value={d}>
                    {d}
                  </TabsTrigger>
                ))}
              </TabsList>
              {serviceDates.map((date) => {
                const schedule = getScheduleForDate(schedules, date);
                const roundCount = schedule?.roundCount ?? 2;
                const scheduleTimes = schedule ? scheduleToTimes(schedule) : {
                  arrivalTimeRound1: "",
                  arrivalTimeRound2: "",
                  returnDepartureTime: "",
                };
                const requirements = routeRequirements[date] ?? {};
                return (
                  <TabsContent key={date} value={date}>
                    <RFQRouteRequirementTable
                      roundCount={roundCount}
                      departurePointIds={selectedDeparturePointIds}
                      departurePoints={departurePoints}
                      scheduleTimes={scheduleTimes}
                      requirements={requirements}
                      onRequirementChange={(depId, field, value) =>
                        setRequirement(date, depId, field, value)
                      }
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "생성 중..." : "RFQ 생성하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
