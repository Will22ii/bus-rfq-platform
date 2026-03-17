# 알림 기능 구현 계획

## 1. 현재 구현 상태

### 1.1 DB

- **테이블 `notifications`** 존재 (Supabase).
- **컬럼:** `id`, `recipient_user_id`(user_profiles.id), `notification_type`, `reference_id`, `is_read`, `read_at`, `created_at`.
- **enum `notification_type`:**  
  `rfq_created`, `quote_submitted`, `rfq_cancelled`, `rfq_completed`, `supplier_selected`.
- **인덱스:** `(recipient_user_id, is_read, created_at DESC)`.

→ 스키마는 알림 수신·타입·참조·읽음 상태 저장에 충분함.  
→ **미구현:** 알림을 **생성(INSERT)** 하는 로직이 코드베이스에 없음.

---

### 1.2 API

- **GET /api/notifications**  
  - 로그인 사용자 본인 알림 목록 조회 (최신순).  
  - 반환: `id`, `type`, `reference_id`, `created_at`, `is_read`.
- **POST /api/notifications** 또는 알림 생성 전용 API  
  - 없음. 알림 생성은 다른 API 내부에서 `notifications` 테이블 INSERT로 처리하는 방식이 적합.

→ **미구현:**  
  - 알림 **생성** 호출 없음.  
  - **읽음 처리(PATCH)** API 없음 (선택).

---

### 1.3 UI

- **헤더:** "알림" 버튼(종 아이콘) → 클릭 시 `/notifications` 페이지로 이동하는 구조만 존재. **미읽음 개수·빨간 뱃지 없음.**
- **/notifications 페이지:**  
  - 알림 목록 테이블(유형, 일시, 읽음).  
  - 유형 라벨: RFQ 생성, 견적 제출, RFQ 취소, RFQ 완료, 공급사 선택.  
  - **구현 시:** enum에 `quote_deadline_passed` 추가 후, 이 페이지에서도 해당 타입에 대한 라벨·문구(예: "견적 마감 완료")를 반영할 것.  
  - **링크 없음** (reference_id로 RFQ 상세/비교 페이지로 이동하지 않음).

→ **미구현:**  
  - 종 아이콘에 미읽음 개수 **빨간색 뱃지** 표시.  
  - 종 클릭 시 **페이지 이동 없이** 우측 상단 **팝오버(드롭다운)** 로 알림 리스트 노출.  
  - 알림 클릭 시 **페이지 이동 없이** 해당 알림만 **읽음 처리** + 스타일 즉시 반영.  
  - 팝오버 닫기: 바깥 영역 클릭 또는 ESC.

---

## 2. 요구 시나리오 정리

### 2.1 Requester(요청자)가 받는 알림 (2종)

| # | 상황 | 알림 메시지(예) | reference_id |
|---|------|------------------|--------------|
| 1 | 자신이 생성한 RFQ에 **누군가 견적을 제출**했을 때 | "OO RFQ에 견적이 제출되었습니다." | rfq_id |
| 2 | 자신이 생성한 RFQ **견적 마감일이 지나 만료**되었을 때 | "OO RFQ 견적 마감이 완료되었습니다. 심사 단계로 넘어갑니다." | rfq_id |

### 2.2 Supplier(공급자)가 받는 알림 (3종)

| # | 상황 | 알림 메시지(예) | reference_id |
|---|------|------------------|--------------|
| 1 | **본인이 견적을 제출한 RFQ**가 마감되어 **심사중(in_review)** 으로 넘어갔을 때 | "OO RFQ 견적이 마감되어 심사 중입니다." | rfq_id |
| 2 | **본인이 노선에서 선택됨(선택 완료)** 했을 때 | "OO RFQ에서 귀사가 선택되었습니다." | rfq_id |
| 3 | **본인이 견적을 제출한 RFQ**를 Requester가 **취소**했을 때 | "OO RFQ가 취소되었습니다." | rfq_id |

### 2.3 UI 동작 (요구사항) — 팝오버(드롭다운) 방식

- **페이지 전환 없음.** Slack/Notion 스타일의 “알림 드롭다운”을 목표로 함.
- **종(🔔) 아이콘:**  
  - 읽지 않은 알림이 있으면 **빨간색 뱃지**로 개수 표시 (예: 빨간 원 + 숫자 3).  
  - 읽지 않은 알림이 없으면 뱃지 미표시.
- **종 클릭 시:**  
  - **페이지 이동 없이** 우측 상단에 **작은 알림 박스(팝오버)** 가 드롭다운처럼 열림.  
  - 카드 형태, 적당한 width (예: 300~350px), 기존 화면 위에 떠 있는 느낌.
- **팝오버 내부:**  
  - 알림 리스트가 **최신순**으로 표시.  
  - 각 알림은 한 줄 또는 두 줄 텍스트.  
  - 리스트는 **세로 스크롤** 가능.
- **읽음/안 읽음:**  
  - **안 읽음:** 더 강조된 스타일 (bold 또는 점 표시).  
  - **읽음:** 일반 텍스트 스타일.
- **알림 클릭 시:**  
  - **다른 페이지로 이동하지 않음.**  
  - 해당 알림만 **읽음 처리**(PATCH) 후, 스타일을 즉시 읽음 상태로 변경.
- **팝오버 닫기:**  
  - 알림 박스 **바깥 영역 클릭** 시 닫힘.  
  - **ESC 키** 입력 시 닫힘.
- **(선택)** 팝오버 하단에 **“모두 읽음 처리”** 버튼 고려.

---

## 3. DB·타입 정리

### 3.1 알림 타입(enum) 추가

- **현재:** `rfq_created`, `quote_submitted`, `rfq_cancelled`, `rfq_completed`, `supplier_selected`.
- **추가 필수(마이그레이션):** `quote_deadline_passed`  
  - **의미:** 견적 마감이 지나 RFQ가 open → in_review로 넘어간 시점.  
  - **수신자:** Requester(자기 RFQ 마감), Supplier(자기가 견적 낸 RFQ 마감).  
  - 스키마에 없으므로 **반드시** `ALTER TYPE notification_type ADD VALUE 'quote_deadline_passed'` 등으로 추가 후 알림 로직 구현.

**대안:** 기존 타입만 쓰고 “메시지/역할”로 구분할 수도 있으나, 통계·필터·메시지 문구 분리 시 **타입 하나 추가**가 명확함.

### 3.2 reference_id 사용 규칙

- **모두 `rfq_id`(UUID) 저장.**  
  - 현재 UI에서는 알림 클릭 시 **페이지 이동 없이 읽음 처리만** 하므로, reference_id는 메시지 문구 보강(예: RFQ 제목 표시) 또는 추후 “상세 보기” 링크용으로 활용.

### 3.3 수신자 결정 규칙

- **recipient_user_id** = `user_profiles.id`.  
  - **회사당 1명:** `user_profiles`에 `UNIQUE(company_id)` 제약이 있어, 한 회사당 수신자는 1명으로 정해짐.
- **Requester 알림:**  
  - `rfqs.requester_company_id` → 해당 company의 `user_profiles.id` 1명.
- **Supplier 알림:**  
  - `rfq_supplier_submissions.supplier_company_id` → 해당 company의 `user_profiles.id` 1명.

---

## 4. 알림이 생성되어야 하는 시점과 위치

### 4.1 Requester: “누군가 견적 제출”

- **시점:** Supplier가 **POST /api/rfqs/[id]/submit** 성공 직후.
- **위치:** `src/app/api/rfqs/[id]/submit/route.ts`  
  - submission·supply·prices INSERT 성공 후,  
  - 해당 RFQ의 `requester_company_id`로 `user_profiles.id` 조회,  
  - `notifications` INSERT:  
    - `notification_type = 'quote_submitted'`,  
    - `reference_id = rfqId`,  
    - `recipient_user_id = (requester의 user_profile id)`.

### 4.2 Requester + Supplier: “견적 마감 만료 → in_review”

- **시점:** RFQ 상태가 **open → in_review**로 바뀌는 순간.
- **현재 상태 전환이 일어나는 곳:**  
  1. **GET /api/rfqs** (목록):  
     - `quote_deadline_at < now`인 open RFQ를 한 번에 `in_review`로 update.  
  2. **GET /api/rfqs/[id]** (상세):  
     - 해당 RFQ가 open이고 마감 지났으면 그 RFQ만 `in_review`로 update.

- **구현 방향:**  
  - **방안 A (권장):**  
    - open → in_review로 **실제로 update한 RFQ**에 대해서만,  
      그 직후(같은 요청 내에서) 알림 생성.  
    - **GET /api/rfqs:** 현재 코드는 마감 지난 open RFQ를 한 번에 update만 하고 변경된 id를 반환하지 않음. 구현 시: **update 전에** `status = 'open' AND quote_deadline_at < now`인 RFQ의 `id` 목록을 **먼저 SELECT**해 두고, 그 id들만 update한 뒤, 같은 요청 내에서 그 id들에 대해서만 requester 1명 + 해당 RFQ에 제출한 supplier들의 user_id에게 `quote_deadline_passed` 알림 INSERT. (또는 Supabase update에 `.select('id')` 등으로 변경된 행 id를 반환받은 뒤, 그 id 기준으로 알림 생성.)  
    - **GET /api/rfqs/[id]:** 이 요청에서 open→in_review로 바꿨다면, 그 1건에 대해 동일하게 requester + 해당 RFQ 제출 supplier들에게 `quote_deadline_passed` INSERT.  
  - **방안 B:**  
    - 별도 cron/Edge Function으로 “마감 지난 open RFQ”를 주기적으로 in_review로 바꾸고, 그때 알림 생성.  
    - 장점: 목록/상세 접근 없이도 알림 발생.  
    - 단점: 인프라·스케줄 관리 필요.

→ **우선 방안 A**로 계획. (이미 상태 전환이 목록/상세에서만 일어나므로, “전환이 일어난 직후”에만 알림을 넣어도 동작 일치.)

### 4.3 Supplier: “본인이 선택됨(supplier_selected)”

- **시점:** Requester가 **노선별로 공급사 선택**했을 때.  
  - 즉 **POST /api/routes/[routeId]/select** body에 `supplier_submission_id`가 있을 때.
- **위치:** `src/app/api/routes/[routeId]/select/route.ts`  
  - selection update 성공 후,  
  - `selected_supplier_submission_id`로 해당 submission의 `supplier_company_id` 조회 → 해당 회사의 `user_profiles.id` 조회,  
  - `notifications` INSERT:  
    - `notification_type = 'supplier_selected'`,  
    - `reference_id = rfq_id`,  
    - `recipient_user_id = (선택된 공급사 user_profile id)`.

- **선택 해제 시:** body가 `selection: "none"`인 경우(공급사 선택 해제)에는 알림을 보내지 않음.

- **참고:** RFQ “완료”(POST /api/rfqs/[id]/complete)는 “모든 노선 선택 완료 후 상태만 completed로 변경”이므로, **알림은 “노선 선택 시점”(select API)** 에만 보내면 됨.  
  - “선택 완료” 알림을 완료 시점에 한 번 더 보내고 싶다면, complete API에서 “선택된 모든 supplier”에게 `supplier_selected` 또는 `rfq_completed` 타입으로 추가 발송하는 것은 선택 사항.

### 4.4 Supplier: “RFQ 취소됨(rfq_cancelled)”

- **시점:** Requester가 **POST /api/rfqs/[id]/cancel** 호출로 해당 RFQ를 취소했을 때.
- **위치:** `src/app/api/rfqs/[id]/cancel/route.ts`  
  - RFQ를 `status = 'cancelled'` 등으로 update 성공 직후,  
  - 해당 `rfq_id`에 대해 **견적을 제출한 모든 공급사**를 조회:  
    - `rfq_supplier_submissions`에서 `rfq_id = rfqId`인 행의 `supplier_company_id` 목록 → 각 회사별 `user_profiles.id` 1명.  
  - 각 수신자에게 `notifications` INSERT:  
    - `notification_type = 'rfq_cancelled'`,  
    - `reference_id = rfqId`,  
    - `recipient_user_id = (해당 supplier의 user_profile id)`.
- **수신자:** 해당 RFQ에 **한 번이라도 견적을 제출한 Supplier** 전원. (제출 이력이 없으면 알림 없음.)

---

## 5. API 확장

### 5.1 기존

- **GET /api/notifications**  
  - 유지.  
  - (선택) 쿼리: `?unread_only=true` 지원 시 헤더 뱃지용 “미읽음 개수”만 가져오기 가능.

### 5.2 추가 (필수·선택)

- **PATCH /api/notifications/[id]** (또는 body에 id 포함)  
  - **파일:** `src/app/api/notifications/[id]/route.ts` (신규 생성).  
  - 단일 알림 **읽음 처리** (`is_read: true`, `read_at` 갱신).  
  - 팝오버에서 알림 클릭 시 호출 → **필수**.
- **(선택) “모두 읽음 처리”**  
  - **PATCH /api/notifications/read-all** 또는 **PATCH /api/notifications** (body: `{ read_all: true }`)  
  - 해당 사용자의 모든 알림을 읽음 처리.  
  - 팝오버 하단 “모두 읽음 처리” 버튼용.

### 5.3 팝오버·뱃지용 데이터

- **미읽음 개수:**  
  - 기존 GET /api/notifications 응답에서 `is_read === false` 개수를 클라이언트에서 계산하거나,  
  - GET에 `?count_only=true` 등으로 미읽음 개수만 반환하는 API 추가.  
- **팝오버 열릴 때:** GET /api/notifications로 목록 조회 후, 최신순으로 표시.

---

## 6. UI 작업 — 팝오버(드롭다운) 알림

### 6.1 기본 동작

- **종(🔔) 아이콘 클릭 시** 페이지 이동 없이, **우측 상단**에 작은 알림 박스(팝오버)가 드롭다운처럼 열림.
- 팝오버는 **카드 형태**, width 약 300~350px, 기존 화면 **위에 떠 있는** 형태.

### 6.2 알림 아이콘(종 + 뱃지)

- **파일:** `src/components/layout/app-header.tsx` (또는 알림 전용 컴포넌트).
- **동작:**  
  - 로그인 사용자일 때 GET /api/notifications(또는 count 전용)로 **미읽음 개수** 조회.  
  - **읽지 않은 알림이 있으면** 종 아이콘에 **빨간색 뱃지**(빨간 원 + 숫자 n) 표시.  
  - **읽지 않은 알림이 없으면** 뱃지 미표시.  
  - **클릭 시** 페이지 이동 없이 **팝오버 토글** (열림/닫힘).

### 6.3 알림 팝오버 내부

- **위치:** 헤더 우측, 종 버튼 기준으로 드롭다운 위치 (예: Popover/DropdownMenu 활용).
- **구성:**  
  - **알림 리스트:** 최신순, 세로 스크롤 가능.  
  - **각 알림:** 한 줄 또는 두 줄 텍스트 (타입별 문구 + 필요 시 reference_id로 RFQ 제목 등 표시).  
  - **읽음/안 읽음:**  
    - **안 읽음:** bold 또는 점(dot) 등으로 강조.  
    - **읽음:** 일반 텍스트.  
  - **(선택)** 하단에 **“모두 읽음 처리”** 버튼.
- **클릭 동작:**  
  - 알림 한 건 클릭 시 **다른 페이지로 이동하지 않고**, 해당 알림만 **읽음 처리**(PATCH) 후 UI를 즉시 읽음 스타일로 갱신.  
  - 팝오버는 유지(닫지 않음) 또는 정책에 따라 닫을 수 있음.
- **닫힘:**  
  - 팝오버 **바깥 영역 클릭** 시 닫힘.  
  - **ESC 키** 입력 시 닫힘.

### 6.4 알림 목록 페이지 (/notifications)

- **파일:** `src/app/(main)/notifications/page.tsx`.
- **역할:**  
  - “알림 전체 보기”용 페이지로 유지하거나, 팝오버와 동일한 리스트·문구를 풀페이지로 제공.  
  - 필요 시 상단에 “알림” 등 제목만 두고, 동일한 알림 리스트 + 읽음 처리 동작 적용.  
  - **타입 추가 시:** `quote_deadline_passed` 등 새 알림 타입을 추가한 경우, 이 페이지의 유형 라벨·표시 문구에도 반영할 것.  
  - **알림 클릭 시** 현재 요구사항대로 **페이지 이동 없이 읽음 처리만** 할지, 또는 이 페이지만 “클릭 시 RFQ 상세/비교로 이동”할지는 정책에 따라 결정 가능.

### 6.5 메시지 문구

- **권장:** 프론트에서 `notification_type` + `reference_id`로 타입별 문구 조합.  
  - **"OO" 치환:** 아래 예시의 "OO"는 `reference_id`(rfq_id)로 조회한 RFQ의 **제목(title)** 으로 치환해 노출. (필요 시 API로 제목만 조회.)
- 타입별 예:  
  - `quote_submitted` → "OO RFQ에 견적이 제출되었습니다."  
  - `quote_deadline_passed` → "OO RFQ 견적 마감이 완료되었습니다. 심사 단계로 넘어갑니다." / "OO RFQ 견적이 마감되어 심사 중입니다."  
  - `supplier_selected` → "OO RFQ에서 귀사가 선택되었습니다."  
  - `rfq_cancelled` → "OO RFQ가 취소되었습니다." (Requester가 취소한 RFQ에 견적 제출한 Supplier용)

---

## 7. 구현 순서 제안

| 단계 | 내용 | 비고 |
|------|------|------|
| 1 | **DB:** enum에 `quote_deadline_passed` 추가 (마이그레이션) | 스키마만 |
| 2 | **공통:** “알림 생성” 헬퍼 함수 (recipient_user_id, type, reference_id) | 서버 유틸 |
| 3 | **Submit API:** 견적 제출 성공 시 Requester에게 `quote_submitted` 알림 생성 | 4.1 |
| 4 | **Select API:** 공급사 선택 시 해당 Supplier에게 `supplier_selected` 알림 생성 | 4.3 |
| 5 | **Cancel API:** RFQ 취소 시 해당 RFQ에 견적 제출한 모든 Supplier에게 `rfq_cancelled` 알림 생성 | 4.4 |
| 6 | **목록/상세 API:** open→in_review 전환 시 Requester + 해당 RFQ 제출 Supplier에게 `quote_deadline_passed` 생성 | 4.2, 방안 A |
| 7 | **GET /api/notifications:** 목록·미읽음 개수 (필요 시 count 전용 옵션) | 5.1, 5.3 |
| 8 | **PATCH /api/notifications/[id]:** 단일 알림 읽음 처리 (필수) | 5.2 |
| 9 | **헤더:** 종 아이콘 + 미읽음 시 빨간 뱃지, 클릭 시 팝오버 토글 | 6.1, 6.2 |
| 10 | **팝오버:** 카드형 알림 리스트(최신순, 스크롤), 읽음/안읽음 스타일, 클릭 시 읽음 처리만, 바깥/ESC로 닫기 | 6.3 |
| 11 | **(선택)** PATCH 모두 읽음 + 팝오버 하단 "모두 읽음 처리" 버튼 | 5.2, 6.3 |
| 12 | **/notifications 페이지:** 정리 또는 팝오버와 동일 UX 유지 | 6.4 |

---

## 8. 추가 시나리오·예외

- **중복 알림 방지:**  
  - 같은 RFQ에 대해 “마감 만료” 알림을 같은 사용자에게 여러 번 넣지 않도록,  
    “이미 `quote_deadline_passed` + 이 rfq_id + 이 recipient” 조합으로 알림이 있으면 INSERT 생략하거나,  
    “open→in_review update가 실제로 1건이라도 갱신된 경우에만” 알림 생성하도록 하면 됨.
- **RFQ 취소:**  
  - Requester가 RFQ를 취소하면, 해당 RFQ에 **견적을 제출한 모든 Supplier**에게 `rfq_cancelled` 알림 발송 (4.4).
- **권한:**  
  - 알림은 본인 것만 조회·읽음 처리 (기존 GET이 이미 recipient_user_id = auth.profile.id 로 제한됨).

---

## 9. 요약

- **이미 있는 것:** DB 테이블·enum, GET /api/notifications, /notifications 목록 화면, 헤더 알림 버튼.
- **추가·변경할 것:**  
  - DB에 `quote_deadline_passed` 타입 추가.  
  - 네 가지 “알림 발생 시점”에서의 INSERT (견적 제출, 마감→in_review, 공급사 선택, **RFQ 취소 시 해당 RFQ에 견적 제출한 Supplier 전원**).  
  - **알림 UI를 팝오버(드롭다운) 방식으로 변경:**  
    - 종 아이콘에 미읽음 개수 **빨간색 뱃지** 표시.  
    - 종 클릭 시 **페이지 이동 없이** 우측 상단 **카드형 팝오버**로 알림 리스트 표시 (최신순, 세로 스크롤).  
    - 읽음/안 읽음 스타일 구분 (안 읽음: bold 또는 점 표시).  
    - 알림 클릭 시 **페이지 이동 없이** 해당 알림만 **읽음 처리** + 즉시 스타일 반영.  
    - 팝오버 닫기: 바깥 영역 클릭 또는 ESC.  
  - **PATCH /api/notifications/[id]** 로 단일 읽음 처리 (필수).  
  - (선택) “모두 읽음 처리” API 및 팝오버 하단 버튼.

이 순서대로 진행하면 요구한 **Requester 2종 + Supplier 3종**(견적 제출, 마감→심사, 공급사 선택, **RFQ 취소**) 알림 시나리오와, Slack/Notion과 유사한 **페이지 전환 없이 빠르게 확인하는 알림 드롭다운 UX**를 만족할 수 있다.
