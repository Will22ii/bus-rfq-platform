# concert_name / venue / destination 정리 계획

## 현재 상태 요약

| 구분 | DB 컬럼 | 의미 | 현재 저장·노출 |
|------|---------|------|----------------|
| RFQ 제목 | `rfqs.title` | RFQ 제목 | 사용자 입력 그대로 |
| 공연/행사명 | `rfqs.concert_name` | 공연명·행사명 | **프론트 미입력** → API에서 `venue`로 채움 → 사실상 venue와 동일 |
| 행사장 | `rfqs.venue` | 행사장(도착지) | 사용자 입력, 노선 `destination`도 이 값으로 저장 |
| 노선 도착지 | `rfq_routes.destination` | 노선별 도착지 | 생성 시 `venue`와 동일 값 저장 (의도된 동작) |

- **생성 플로우**: 사용자는 `title`, `venue`, 견적 마감일만 입력. `destination`은 서버/프론트에서 `venue`로 자동 채움 ✅  
- **노출 문제**: RFQ 상세 상단에서 `concert_name · venue` 를 같이 보여줘서, 둘 다 venue와 같을 때 "인스파이어아레나 · 인스파이어아레나" 처럼 중복 노출됨.

---

## 1. concert_name 필드: 제거 vs 유지

### Option A: DB에서 concert_name 제거 (추천하지 않음, 단기)

- **장점**: 스키마 단순화, 중복 필드 제거.
- **단점**:
  - 마이그레이션 필요 (`ALTER TABLE rfqs DROP COLUMN concert_name`).
  - API·프론트에서 `concert_name` 참조 전부 제거해야 함 (GET 응답, 타입, select 목록 등).
  - 나중에 "공연명"과 "행사장"을 구분하고 싶을 때 컬럼을 다시 추가해야 함.

### Option B: concert_name 유지, 노출만 정리 (추천)

- **장점**:
  - DB/API 변경 최소화. 기존 데이터·NOT NULL 제약 유지.
  - 나중에 공연명 입력란을 추가해 `concert_name`만 채우면 됨.
  - 당장은 **노출만** `venue` 하나로 통일하면 중복 해소.
- **단점**: 스키마에 의미상 중복 필드가 남음 (현재는 venue와 동일 값).

**권장**: **Option B**.  
지금은 "행사장만 입력, 공연명은 없음"인 상태이므로, **DB 구조는 그대로 두고 노출만 venue 기준으로 정리**하는 쪽이 부담이 적고, 이후 공연명을 도입할 때도 유리함.

---

## 2. 노출 정리: venue / destination / concert_name 중 하나만 보이기

목표: **"행사장/도착지"는 한 번만 보이게** 하기.  
데이터 소스는 **`venue` 하나**로 통일하고, `concert_name`·`destination`은 같은 값이어도 화면에는 반복하지 않기.

### 2.1 RFQ 상세 페이지 상단 (가장 중요)

| 현재 | 변경 후 |
|------|----------|
| 제목 아래 `concert_name · venue` (예: 인스파이어아레나 · 인스파이어아레나) | 제목 아래 **`venue`만** (예: 인스파이어아레나) |

- **파일**: `src/app/(main)/rfqs/[id]/page.tsx`
- **코드**:  
  `{(rfq.concert_name as string) ?? ""} · {(rfq.venue as string) ?? ""}`  
  → `{(rfq.venue as string) ?? ""}`  
- **의미**: 행사장(도착지)은 한 필드(venue)로만 표시.

### 2.2 그 외 화면

- **RFQ 목록** (`/rfqs`): 이미 `venue`만 노출 → 변경 없음.
- **마이페이지** (requester/supplier RFQ 목록): 이미 `venue`만 노출 → 변경 없음.
- **견적 비교** (`/rfqs/[id]/compare`): 노선 열에 "출발지 → destination" 표시.  
  - 도착지는 모든 노선 동일(= venue)이므로, **이미 적용한 대로 "출발지만" 보여도 됨** (현재 compare는 아직 "출발지 → destination"인데, 요청자 요구에 따라 출발지만 노출하도록 추가 수정 가능).
- **노선 테이블 등**: 노선 열은 이미 "출발지만" 노출하도록 수정된 상태 → destination은 테이블에 안 나옴. ✅

정리하면, **실제로 손댈 곳은 RFQ 상세 상단 한 곳**이면 충분함.

---

## 3. 작업 순서 제안

1. **노출만 수정 (DB/API 변경 없음)**  
   - [x] RFQ 상세 상단: `concert_name · venue` → `venue`만 표시 (`src/app/(main)/rfqs/[id]/page.tsx`).
   - [x] 견적 비교 페이지: 노선 열 "출발지 → destination" → 출발지만 표시 (`src/app/(main)/rfqs/[id]/compare/page.tsx`, 노선별 공급 현황·노선별 가격 테이블).
2. **(선택) 문서 정리**  
   - [ ] `docs/04_api_spec.md` 등에 "상세 화면에서는 행사장(venue)만 노출, concert_name은 보내지 않아도 되고 보내면 저장만 함" 정도 명시.
3. **(미래) concert_name 활용**  
   - 공연명을 따로 쓰고 싶을 때:  
     - 1단계 기본 정보에 "공연/행사명" 입력란 추가.  
     - API에 `concert_name` 전달.  
     - 상세 상단은 예: `concert_name`이 있으면 "공연명 · venue", 없으면 "venue"만 노출하도록 분기.

---

## 4. 요약

- **DB 구조**: `concert_name`은 **당분간 유지**하는 쪽 권장. 제거까지 할 필요는 없음.
- **저장 로직**:  
  - 사용자는 `venue`(행사장)만 입력.  
  - `destination`은 생성 시 `venue`와 동일하게 넣는 현재 방식 유지 ✅  
- **노출**:  
  - RFQ 상세 상단에서 **venue만** 보이게 바꾸면, "destination이랑 venue랑 한번에 노출"되는 느낌이 사라짐.  
  - 수정 범위: 상세 페이지 한 곳, 한 줄 수준.

이 순서로 진행하면 DB 구조는 건드리지 않고, 노출만 정리할 수 있음.
