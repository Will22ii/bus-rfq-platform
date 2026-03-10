# Admin 계정 및 Admin 페이지 구현 계획

Admin 계정 생성부터 관리자 페이지(통계·전체 조회) 구현까지의 단계별 계획이다.  
`docs/11_evolution_plan.md` Phase 1.2(관리자 실제 인증), Phase 2.2(관리자 기능 연동)에 대응한다.

---

## 1. 현재 상태

| 항목 | 상태 |
|------|------|
| 라우트 | `/admin`, `/admin-login` 존재 |
| 인증 | admin-login은 비밀번호 입력 후 무조건 `/admin` 이동(백엔드 검증 없음) |
| Admin 페이지 | 안내 문구 + "관리자 로그인" 버튼만 있음. 통계·전체 조회 미구현 |
| DB | `user_profiles`, `companies`에 관리자 구분 필드 없음 |
| 헤더 | Admin 링크 노출 여부는 코드 기준 확인 필요(현재 헤더에는 없을 수 있음) |

---

## 2. 구현 범위(요약)

1. **Admin 계정 정의** — DB/인증으로 “이 사용자는 관리자” 구분
2. **Admin 로그인** — 기존 Supabase Auth 사용, 로그인 후 관리자 여부 검사
3. **Admin 전용 API** — 통계·전체 RFQ 등 (관리자만 호출 가능)
4. **Admin 페이지 UI** — 통계 대시보드 + 전체 RFQ 목록 등

---

## 3. 단계별 계획

### 3.1 Admin 계정 정의(DB·시드)

**목표:** 어떤 사용자가 관리자인지 DB에서 식별 가능하게 한다.

**방안 (택 1)**

- **A. `user_profiles`에 `is_admin` 컬럼 추가**  
  - 장점: 기존 인증 플로우와 일치, `/api/me`에서 `profile.is_admin` 반환 가능  
  - 단점: user_profiles는 “1사 1계정”이라 관리자 전용 회사가 필요할 수 있음  
- **B. `admin_users` 테이블 추가 (auth_user_id만 저장)**  
  - 장점: 기존 회사/프로필과 무관하게 “이 Auth 사용자만 관리자”로 지정 가능  
  - 단점: API에서 관리자 체크 시 이 테이블 조인 또는 별도 조회 필요  

**권장:**  
- 폐쇄 베타·소수 관리자라면 **B(`admin_users`)** 가 단순.  
- “관리자도 한 회사에 소속되어 일반 로그인과 동일하게 쓰고, 추가로 관리자 메뉴만 보이게”하려면 **A(`user_profiles.is_admin`)** 가 자연스럽다.

**작업 내용(안 A 기준)**  
- `user_profiles`에 `is_admin boolean NOT NULL DEFAULT false` 추가  
- 마이그레이션 또는 `schema.sql` 수정 + 기존 DB 반영  
- 시드: 관리자로 쓸 테스트 계정 1개에 대해 `user_profiles.is_admin = true` 설정 (시드 스크립트 또는 수동)  
- **관리자 전용 계정**: 해당 회사는 `can_request=false`, `can_supply=false`여도 됨. 로그인 후 통계 페이지만 사용.

**작업 내용(안 B 기준)**  
- `admin_users (auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id))` 생성  
- 시드: 관리자로 쓸 auth.users 1명의 id를 `admin_users`에 INSERT  

---

### 3.2 인증·API에서 관리자 판별

**목표:** 요청자가 “관리자”인지 서버에서 판별하고, 관리자 전용 API는 관리자만 호출 가능하게 한다.

**작업 내용**

- **api-auth.ts**  
  - `getAuthFromRequest` 이후(또는 별도 함수)에서 `user_profiles.is_admin` 또는 `admin_users` 존재 여부 조회  
  - `AuthResult`에 `isAdmin: boolean` 추가  
  - `requireAdmin(request)` 함수 추가: 세션 유효 + 관리자일 때만 통과, 아니면 403
- **/api/me**  
  - 응답에 `isAdmin` 포함 (프론트에서 Admin 메뉴 노출 여부 판단용)
- **admin-login**  
  - “공용 비밀번호” 제거.  
  - 일반 로그인(`/login`)과 동일한 Supabase Auth 로그인 사용.  
  - 로그인 성공 후 `/api/me`로 `isAdmin` 확인 → true면 `/admin`으로 리다이렉트, false면 “권한 없음” 메시지 후 RFQ 목록 등으로.
- **/admin 라우트 보호**  
  - `/admin` 진입 시(서버 또는 클라이언트): 세션 없으면 `/login`, 세션 있지만 `!isAdmin`이면 403 또는 “권한 없음” 페이지.

---

### 3.3 Admin 전용 API

**목표:** 통계·전체 조회를 관리자만 호출할 수 있는 API로 제공한다.

**엔드포인트 예시**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/stats` | 대시보드용 요약 통계 (RFQ 상태별 건수, 기간별 등) |
| GET | `/api/admin/rfqs` | 전체 RFQ 목록 (페이징·필터: 상태, 기간) |
| GET | `/api/admin/rfqs/[id]` | (선택) 관리자용 RFQ 상세(마스킹 해제 등) |

**구현 요점**

- 모든 핸들러에서 `requireAdmin(request)` 호출 후 진행.  
- `getAuthFromRequest`만 쓰면 “일반 사용자도 접근 가능”하므로 반드시 `requireAdmin` 사용.

**통계 항목 예시 (`/api/admin/stats`)**

- RFQ 상태별 건수: open, in_review, completed, cancelled  
- 기간별: 금주/금월 생성 RFQ 수 (선택)  
- 완료 RFQ 중 “공급사 선택 완료” 건수 등 (Success 건수 정의에 맞게)

---

### 3.4 Admin 페이지 UI

**목표:** 관리자 로그인 후 보이는 “통계 보는 페이지”와 전체 RFQ 목록을 구현한다.

**페이지 구성 제안**

1. **`/admin` (메인)**  
   - 로그인된 관리자만 접근.  
   - 상단: 요약 카드 (RFQ 상태별 건수 — `/api/admin/stats` 사용)  
   - 하단 또는 별도 섹션: “전체 RFQ 목록” 테이블 (제목, 상태, 요청사, 마감일, 생성일 등), `/api/admin/rfqs` 사용  
   - 필요 시 상태/기간 필터, 페이징
2. **(선택) `/admin/rfqs/[id]`**  
   - 관리자용 RFQ 상세(마스킹 해제, 전체 견적 등).  
   - 우선순위는 낮게 두고, 1번만 먼저 구현해도 됨.

**UI 요구사항**

- 기존 디자인 시스템(Card, Table, Button 등) 재사용.  
- “통계 확인”이 계획에 있으므로, 상태별 건수는 반드시 표시.

---

### 3.5 헤더·네비게이션

**목표:** Admin 링크는 관리자에게만 노출한다.

- `useAuth()` 또는 `/api/me`에서 `isAdmin` 사용.  
- `company` 등과 함께 `isAdmin === true`일 때만 헤더에 “Admin” 링크 표시.  
- 클릭 시 `/admin`으로 이동 (이미 로그인된 관리자이므로 별도 admin-login 불필요).

---

## 4. 작업 순서 제안

| 순서 | 작업 | 산출물 |
|------|------|--------|
| 1 | Admin 계정 정의(스키마·시드) | migration 또는 schema + seed |
| 2 | api-auth에 isAdmin·requireAdmin, /api/me에 isAdmin | 백엔드 |
| 3 | admin-login을 일반 로그인+isAdmin 체크로 변경, /admin 접근 제어 | 로그인·라우트 |
| 4 | GET /api/admin/stats, GET /api/admin/rfqs 구현 | Admin API |
| 5 | /admin 페이지 UI(통계 카드 + 전체 RFQ 목록) | Admin 페이지 |
| 6 | 헤더에 Admin 링크(관리자만 노출) | 헤더 |

---

## 5. 정리

- **Admin 계정:** `user_profiles.is_admin` 또는 `admin_users` 테이블로 “관리자” 지정.  
- **Admin 로그인:** Supabase Auth 그대로 사용, 로그인 후 `isAdmin`으로만 `/admin` 접근 허용.  
- **Admin 페이지:** 통계(상태별 건수 등) + 전체 RFQ 목록을 먼저 구현하고, 필요 시 상세·마스킹 해제는 단계적으로 추가.

이 순서대로 진행하면 “Admin 계정 만들기 → 로그인 → 통계 보는 Admin 페이지”까지 구현할 수 있다.
