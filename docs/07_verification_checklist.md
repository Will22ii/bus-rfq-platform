# 검증 체크리스트
문서 요구사항 및 채팅 프롬프트 반영 여부 · 엣지 케이스

---

## 1. 문서 요구사항 반영 여부

### 01 Product Context
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| RFQ 생성 → 견적 제출 → 비교 → 선택 → 연락처 공개 | ✅ | API·UI 구현 |
| Requester / Supplier 역할 분리 | ✅ | can_request, can_supply 기반 |
| Supplier는 다른 공급사 정보 비공개 (sealed bidding) | ✅ | API 상세/비교에서 역할별 분리 |
| 회사당 계정 1개 | ✅ | user_profiles UNIQUE(company_id) |
| RFQ 작성 완료 후 수정 불가 | ✅ | 수정 API 없음 |
| 견적 접수 기간 최대 5일 | ✅ | POST /api/rfqs 검증 |
| 가격 노선 기준·날짜 무관 | ✅ | rfq_supplier_route_prices 구조 |
| RFQ 목록 10일 후 숨김 | ✅ | list_visible_until_at, complete 시 +10일 |
| RFQ 취소 (Requester) | ✅ | POST /api/rfqs/[id]/cancel, 상세 페이지 «RFQ 취소» 버튼 |

### 02 System Architecture
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| Next.js, App Router, TypeScript, Tailwind, shadcn | ✅ | |
| Route Handlers 백엔드 | ✅ | /api/* |
| Supabase Postgres | ✅ | schema.sql |
| Supabase Auth 이메일+비밀번호 | ✅ | /login |
| 관리자 /admin-login, 공용 비밀번호 | ✅ | UI만, 실제 인증 미연동 |
| 권한 검증 프론트+백엔드 | ✅ | requireRequester 등 + UI 버튼 숨김 |
| UI 한국어, 코드/DB 영어 | ✅ | |
| 로그인 후 RFQ 목록으로 이동 | ✅ | redirect /rfqs |
| /login, /rfqs, /rfqs/[id], /rfqs/new, /my, /mypage, /notifications, /admin | ✅ | 라우트 존재 |
| **Middleware 세션 확인** | ⚠️ | **(main) layout 클라이언트 리다이렉트로 대체** |

### 03 Database Schema
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| 테이블·ENUM·제약·인덱스 | ✅ | supabase/schema.sql |
| 생성 순서, UNIQUE, CHECK | ✅ | |
| RFQ 생성 시 rfq_route_selections 기본 none | ✅ | POST /api/rfqs |

### 04 API Spec
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| Authorization Bearer, 세션·회사·역할 검증 | ✅ | api-auth.ts |
| POST/GET /api/rfqs, GET /api/rfqs/[id] | ✅ | |
| POST /api/rfqs/[id]/submit 검증 5종 | ✅ | 노선 수, 공급 규칙, 가격, 1회 제출 |
| GET /api/rfqs/[id]/compare, 마스킹 | ✅ | open/in_review 마스킹, completed 시 선택만 공개 |
| POST /api/routes/[routeId]/select | ✅ | selected / none |
| POST /api/rfqs/[id]/complete | ✅ | 모든 노선 선택 여부 검증 |
| My RFQ (requester/supplier), GET /api/notifications | ✅ | |
| success/error 응답 형식 | ✅ | jsonSuccess, jsonError |
| POST /api/rfqs/[id]/cancel | ✅ | Requester만, open/in_review 시 cancelled + list_visible_until_at 설정 |

### 05 UI Spec
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| 데스크톱 전용, 표 기반 | ✅ | min-w 1280, Table 위주 |
| 헤더: 로고 | RFQ | My RFQ | 알림 | 프로필 | ✅ | AppHeader |
| 상태 배지 (견적 접수중 등 4종) | ✅ | StatusBadge |
| RFQ 생성 2단계 | ✅ | /rfqs/new step 1·2 |
| 날짜 탭, 노선 테이블, 가격 테이블 | ✅ | 상세·비교 |
| 배차불가 체크 시 0/0, 가격 비활성 | ✅ | RFQ 상세 |
| 견적 제출하기, 제출 완료 표시 | ✅ | |
| 비교 화면 노선/가격 테이블, 공급사 선택 | ✅ | |
| 완료 시 선택 공급사만 연락처 공개 | ✅ | compare 페이지 |
| My RFQ 탭 (내가 생성/내가 제출) | ✅ | |
| Sidebar (선택적) | ⚠️ | **미구현** (헤더로 대체) |

### 06 Dev Plan
| 요구사항 | 반영 | 비고 |
|----------|------|------|
| Database → API → UI 순서 | ✅ | |
| API 구현 순서 | ✅ | |
| 알림 MVP 우선순위 낮음 | ✅ | 목록만 구현 |

---

## 2. 채팅 프롬프트 반영 여부

| 프롬프트 요청 | 반영 | 비고 |
|---------------|------|------|
| Next.js + TypeScript + Tailwind + shadcn, App Router, Desktop-first | ✅ | |
| Supabase client, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY | ✅ | .env.local, lib/supabase/client.ts |
| DB 스키마만 생성 (03 기반), API/UI 없음 | ✅ | 당시 작업 범위 |
| schema 검토 및 수정 (auth_user_id UNIQUE, CHECK 등) | ✅ | |
| API Route Handlers, 인증·권한·sealed bidding | ✅ | |
| create_rfq, get_rfqs, get_rfq_detail, supplier_submit, requester_compare, select_supplier, complete_rfq, my requester/supplier rfqs, notifications | ✅ | |
| UI: RFQ List/Create/Detail/Compare, My RFQ, Admin, 한국어, 데스크톱, 표·날짜탭 | ✅ | |
| .env.local = 뒤 공백 주의 | ✅ | 안내만 (파일 수정은 사용자) |

---

## 3. 엣지 케이스 및 보완 사항

### 3.1 보완 완료 (반영됨)
1. **RFQ 취소**: POST /api/rfqs/[id]/cancel 구현, 상세 페이지에 «RFQ 취소» 버튼 추가. 취소 시 `cancelled_at`, `list_visible_until_at`(현재+10일) 설정.
2. **open → in_review 전환**: GET /api/rfqs 목록 조회 시·GET /api/rfqs/[id] 상세 조회 시, `status=open` 이고 `quote_deadline_at < now` 이면 `in_review`, `review_started_at` 업데이트.
3. **취소된 RFQ 목록 노출**: 취소 API에서 `list_visible_until_at` 설정하여 10일간 목록 노출.

### 3.2 검증·엣지 케이스 (적용/확인)
4. **견적 마감일이 과거인 RFQ 생성**
   - **보완 완료**: `quote_deadline_at > now` 검증 추가 (POST /api/rfqs).
5. **노선 0개 RFQ 완료**
   - 모든 노선에 선택이 있으면 완료 가능. 노선 0개면 `routeIds.length === 0`으로 everyRouteHasSelection이 true. 문서는 "모든 노선에 대해"이므로 노선 0개 완료 허용으로 해석 가능. **유지.**
6. **공급 대수 0·0 + 가격 입력**
   - API: 배차불가 시에만 가격 null. UI: 배차불가 체크 시 가격 비활성. **일치.**
7. **Supplier가 타 RFQ의 route_id로 제출**
   - API: route_supplies의 route_id가 해당 RFQ의 rfq_routes에 속하는지 검증함. **적용됨.**
8. **동시 제출 (같은 RFQ·같은 공급사)**
   - DB UNIQUE(rfq_id, supplier_company_id). **보호됨.**
9. **Requester가 타 회사 RFQ compare/complete 호출**
   - compare/complete에서 requester_company_id 일치 검사. **적용됨.**
10. **departure_points 0개일 때 RFQ 생성**
    - **보완 완료**: POST /api/rfqs에서 모든 route의 departure_point_id를 수집해 departure_points 테이블에 존재하는지 검증.

### 3.3 전체 엣지 케이스 검토 (최종)

| # | 엣지 케이스 | 적용 여부 | 비고 |
|---|-------------|-----------|------|
| 1 | RFQ 취소 (open/in_review, 본인만) | ✅ | cancel API, UI |
| 2 | open → in_review (마감일 경과 시) | ✅ | GET rfqs, GET rfqs/[id] |
| 3 | 견적 마감일 과거/5일 초과 | ✅ | API + 클라이언트(과거/5일) |
| 4 | 노선 0개 RFQ 완료 | ✅ | everyRouteHasSelection true 시 허용 |
| 5 | 공급 0·0 + 가격 null | ✅ | submit 검증 |
| 6 | 타 RFQ route_id 제출 | ✅ | route_supplies가 해당 RFQ 노선인지 검증 |
| 7 | 동일 RFQ 중복 제출 | ✅ | UNIQUE(rfq_id, supplier_company_id) |
| 8 | 타 회사 RFQ compare/complete | ✅ | requester_company_id 검사 |
| 9 | departure_point_id 무효 | ✅ | POST rfqs에서 존재 여부 검증 |
| 10 | **견적 가격 음수** | ✅ | **submit에서 round_trip_price, one_way_price >= 0 검증 추가** |
| 11 | **service_date 잘못된 형식** | ✅ | **POST rfqs에서 invalid service_date 검증 추가** |
| 12 | **destination 빈 문자열** | ✅ | **POST rfqs에서 destination 필수 검증 추가** |
| 13 | 출발지 0개 시 노선 추가 | ✅ | **UI: 노선 추가 버튼 비활성화 + 안내 문구** |
| 14 | 마감일 미래 검증(클라이언트) | ✅ | **handleCreate에서 과거 시점 검사 추가** |
| 15 | 잘못된 RFQ ID (404) | ✅ | API 404 → 클라이언트 res.error로 표시 |
| 16 | select: 타 RFQ의 supplier_submission_id | ✅ | submit rfq_id 일치 검사 |
| 17 | complete: in_review가 아닌 상태 | ✅ | status === "in_review" 검사 |
| 18 | submit: open이 아닌 RFQ | ✅ | status !== "open" 시 400 |

---

## 4. 요약

- **반영 완료**: 문서 01~06 및 채팅에서 요청한 대부분의 기능(스키마, API, UI, 인증, 권한, sealed bidding, 한국어, 데스크톱) 반영됨.
- **보완 완료**: RFQ 취소 API·UI, quote_deadline_at > now 검증, open→in_review 전환, 취소 시 list_visible_until_at, departure_point_id 유효성 검증 모두 반영됨.
- **엣지 케이스 검토**: 3.3 표 기준 18건 검토·적용. 추가 반영: 견적 가격 >= 0, service_date 유효성, destination 필수, RFQ 생성 화면 마감일 과거 검사·출발지 없을 때 노선 추가 비활성화 및 안내.
