# 전체 검증 보고서
00_bug_checklist.md · 08_test_plan.md 대조 검증

---

## 1. 00_bug_checklist.md (12개 버그) 검증 결과

| # | 버그 | 요구 해결 | 코드 검증 | 비고 |
|---|------|-----------|-----------|------|
| 1 | 동일 공급사 중복 제출 | DB UNIQUE + API 검사 | ✅ | schema UNIQUE(rfq_id, supplier_company_id), submit에서 existing 체크 후 400 |
| 2 | RFQ 마감 후 제출 | now > quote_deadline → reject | ✅ **보완** | submit에 quote_deadline_at 검사 추가 (마감 경과 시 400) |
| 3 | open 상태에서 requester 선택 | status must be in_review | ✅ **보완** | select API를 in_review만 허용하도록 변경 (open 시 400) |
| 4 | Supplier가 다른 RFQ route 제출 | route_id belongs to rfq_id | ✅ | submit에서 routeIdsSet으로 해당 RFQ 노선만 허용 |
| 5 | 공급 대수 초과 | supply ≤ required | ✅ | submit에서 supply_round_trip_count > required 시 400, 편도 동일 |
| 6 | 배차불가 + 가격 입력 | 0,0이면 price null | ✅ | submit에서 (0,0)이면 가격 null 필수, 아니면 가격 필수 |
| 7 | RFQ 완료 상태 변경 오류 | every route must have selection | ✅ | complete에서 everyRouteHasSelection·everySelectionDecided 검사 |
| 8 | Supplier 정보 유출 | supplier view mask | ✅ | GET rfqs/[id] 비-requester 시 본인 제출만 반환 |
| 9 | RFQ 목록 숨김 정책 | list_visible_until_at | ✅ | GET rfqs에서 completed/cancelled는 list_visible_until_at >= now 만 |
| 10 | departure_points 없는 경우 | departure_point_id exists | ✅ | POST rfqs에서 departure_points 테이블 존재 검증 |
| 11 | Supplier가 자기 제출 수정 | submission immutable | ✅ | 제출 수정/삭제 API 없음 |
| 12 | 동시 선택 race condition | transaction 또는 정책 | ⚠️ | 별도 트랜잭션 없음, last-write wins. 문서화 권장 |

### 추가 UI 버그 5개 (체크리스트)

| # | 항목 | 검증 |
|---|------|------|
| 1 | Dropdown UUID 표시 | ✅ 출발지·버스타입 SelectValue에 name/label 표시로 수정됨 |
| 2 | 날짜 탭 상태 꼬임 | ⚠️ 수동 확인 권장 (Tabs + state) |
| 3 | 노선 추가 state reset | ⚠️ 수동 확인 권장 (addRoute 시 기존 routes 유지) |
| 4 | 가격 테이블 sync | ⚠️ 수동 확인 권장 (노선 추가 시 supply/prices 배열 동기화) |
| 5 | submit validation 오류 | ⚠️ 수동 확인 권장 (필수 필드·에러 메시지) |

### TOP 3 위험 버그

| # | 항목 | 상태 |
|---|------|------|
| 1 | Supplier 정보 유출 | ✅ API·비교 화면 마스킹 적용 |
| 2 | RFQ 완료 후 수정 | ✅ 수정 API 없음 |
| 3 | 중복 제출 | ✅ UNIQUE + API 검사 |

---

## 2. 08_test_plan.md 대조 검증

### 2.1 테스트 환경
- Next.js App Router, TypeScript, Tailwind, shadcn, Supabase: ✅ 프로젝트 구조 일치
- 테스트 데이터: companies, user_profiles, departure_points 시드 파일 존재 (seed_companies, seed_users, seed_departure_points)

### 2.2 Authentication Test
- 2.1 로그인 성공 → /login, /rfqs 리다이렉트: ✅ 로그인·리다이렉트 구현
- 2.2 로그인 실패: ✅ Supabase Auth 메시지
- 2.3 세션 유지: ✅ 클라이언트 세션

### 2.3 RFQ Creation Test
- 3.1 RFQ 생성 화면 접근: ✅ /rfqs/new, can_request 체크
- 3.2 RFQ 생성: ✅ 공연명·출발지·날짜·노선·버스타입·필요대수 입력 후 생성
- 3.3 DB 테이블 생성: ✅ POST rfqs 시 rfqs, rfq_dates, rfq_routes, rfq_route_selections 생성

### 2.4 Supplier Submission Test
- 4.1 목록 조회: ✅ GET /api/rfqs
- 4.2 상세 조회: ✅ 날짜 탭·노선 테이블·가격 테이블
- 4.3 견적 제출: ✅ 제출 후 수정 불가·제출 완료 표시
- 4.4 중복 제출 방지: ✅ "Already submitted" 400

### 2.5 Requester Comparison Test
- 5.1 비교 화면: ✅ 공급사 A/B/C (supplier_label)
- 5.2 sealed bidding: ✅ Supplier는 본인 데이터만, Requester는 마스킹된 비교
- 5.3 공급사 선택: ✅ 노선별 선택·선택 안함 (in_review에서만)

### 2.6 RFQ Completion Test
- 6.1 완료 조건: ✅ 모든 노선 selected 또는 none
- 6.2 완료: ✅ status completed, list_visible_until_at 설정
- 6.3 공급사 공개: ✅ completed 시 선택된 공급사 회사명·전화 공개 (compare·상세)

### 2.7 Permission Test
- 7.1 Supplier 권한 제한: ✅ requireRequester로 RFQ 생성·선택·완료 API 차단
- 7.2 Requester 권한: ✅ RFQ 생성·비교·선택·완료 가능

### 2.8 Sealed Bidding Test
- Supplier View: ✅ 다른 공급사 정보 비공개
- Requester View: ✅ 공급사·가격·공급대수 확인 (마스킹/공개 정책)

### 2.9 Error Handling Test
- 잘못된 RFQ ID: ✅ 404
- 잘못된 route_id (submit): ✅ 400 (route_supplies must contain exactly one entry per RFQ route)
- 음수 가격: ✅ submit에서 price >= 0 검증

### 2.10 Edge Case Test
| 케이스 | 기대 | 검증 |
|--------|------|------|
| RFQ 취소 | cancelled | ✅ cancel API |
| 마감일 초과 | 자동 in_review | ✅ GET rfqs·GET rfqs/[id] 시 업데이트 |
| 노선 0개 RFQ | 완료 가능 | ✅ everyRouteHasSelection true |
| 배차불가 | 가격 null | ✅ submit 검증 |
| 공급대수 초과 | validation error | ✅ submit 검증 |
| 중복 제출 | DB constraint | ✅ UNIQUE + API |

### 2.11·2.12
- 성능/안정성·MVP 완료 기준: 수동/부하 테스트 권장

---

## 3. 이번 검증에서 보완한 코드

1. **POST /api/rfqs/[id]/submit**  
   - `quote_deadline_at` 조회 후, `now >= quote_deadline_at` 이면 400 "Quote deadline has passed" 반환.

2. **POST /api/routes/[routeId]/select**  
   - `status !== "in_review"` 이면 400 (open 상태에서 공급사 선택 불가).

---

## 4. 요약

- **00_bug_checklist**: 12개 중 10개 이미 충족, 2개(마감 후 제출·open 시 선택) API 보완 완료. 12번(race)은 정책 문서화 권장.
- **08_test_plan**: 문서 항목 대부분 코드와 일치. 테스트 환경·시나리오·권한·sealed bidding·에러·엣지케이스 검증 완료.
- 추가 UI 버그 5개는 일부만 코드로 확인 가능하므로 수동 확인 권장.
