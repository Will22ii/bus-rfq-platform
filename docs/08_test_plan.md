# Test Plan
Shuttle Partner Beta RFQ System

본 문서는 RFQ 플랫폼 MVP 기능 검증을 위한 테스트 계획을 정의한다.

목표

- 핵심 기능 정상 동작 확인
- 역할별 권한 검증
- sealed bidding 정책 검증
- 주요 엣지 케이스 검증
- API / UI / DB 동작 검증

테스트는 다음 두 관점으로 진행한다.

1. 사용자 시나리오 기반 테스트
2. 기술적 기능 검증

---

# 1. 테스트 환경

## 개발 환경

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Postgres
- Supabase Auth
- Vercel 배포 예정

## 테스트 데이터

필수 테이블

- companies
- user_profiles
- departure_points

테스트 계정 예시

| 역할 | 이메일 | 회사 |
|-----|------|------|
| Requester | requester@test.com | 서울고려 |
| Supplier | supplier@test.com | BS관광 |

---

# 2. Authentication Test

목적

로그인 및 세션 관리 정상 동작 확인

---

## 테스트 2.1 로그인 성공

조건

- auth.users 계정 존재
- user_profiles 연결 존재

절차

1. /login 접속
2. 이메일 입력
3. 비밀번호 입력
4. 로그인 버튼 클릭

기대 결과

- 로그인 성공
- `/rfqs` 페이지로 이동

---

## 테스트 2.2 로그인 실패

절차

1. 존재하지 않는 이메일 입력
2. 로그인 시도

기대 결과

- `Invalid login credentials` 표시

---

## 테스트 2.3 세션 유지

절차

1. 로그인
2. 페이지 새로고침

기대 결과

- 로그인 상태 유지

---

# 3. RFQ Creation Test

목적

Requester가 RFQ를 정상 생성할 수 있는지 확인

---

## 테스트 3.1 RFQ 생성 화면 접근

조건

Requester 계정

절차

1. `/rfqs/new` 접속

기대 결과

RFQ 생성 화면 표시

---

## 테스트 3.2 RFQ 생성

입력

- 공연명
- 행사장
- 날짜
- 노선
- 버스타입
- 필요 대수

절차

1. RFQ 생성
2. 제출

기대 결과

- RFQ 생성 성공
- `/rfqs` 목록에 표시
- 상태 = `견적 접수중`

---

## 테스트 3.3 RFQ 생성 검증

확인

DB 테이블


rfqs
rfq_dates
rfq_routes
rfq_route_selections


모두 생성되어야 한다.

---

# 4. Supplier Submission Test

목적

Supplier가 견적을 제출할 수 있는지 검증

---

## 테스트 4.1 RFQ 목록 조회

Supplier 계정

절차

1. `/rfqs` 접속

기대 결과

RFQ 목록 표시

---

## 테스트 4.2 RFQ 상세 조회

절차

1. RFQ 클릭

기대 결과

다음 표시

- 날짜 탭
- 노선 테이블
- 가격 테이블

---

## 테스트 4.3 견적 제출

입력


공급 왕복 대수
공급 편도 대수
연식
왕복 가격
편도 가격


절차

1. 견적 제출 버튼 클릭

기대 결과

- 제출 성공
- 수정 불가
- 제출 완료 표시

---

## 테스트 4.4 중복 제출 방지

절차

1. 같은 RFQ에 다시 제출 시도

기대 결과


이미 제출됨


에러 발생

---

# 5. Requester Comparison Test

목적

Requester가 공급사를 비교할 수 있는지 검증

---

## 테스트 5.1 비교 화면 접근

절차

1. RFQ 상세
2. 비교 페이지 이동

기대 결과

공급사 컬럼 생성


A 공급사
B 공급사
C 공급사


---

## 테스트 5.2 sealed bidding 검증

Supplier 화면

확인


다른 공급사 가격
다른 공급사 공급대수


보이지 않아야 한다.

---

## 테스트 5.3 공급사 선택

절차

1. 노선별 공급사 선택

옵션


A 공급사
B 공급사
C 공급사
선택 안함


---

# 6. RFQ Completion Test

목적

RFQ 완료 로직 검증

---

## 테스트 6.1 완료 조건

조건

모든 노선에 대해


selected
또는
none


선택

---

## 테스트 6.2 RFQ 완료

절차

1. 완료 버튼 클릭

기대 결과

RFQ 상태


completed


---

## 테스트 6.3 공급사 공개

완료 후

Requester 화면

확인


선택된 공급사
회사명
전화번호


표시

---

# 7. Permission Test

목적

역할별 접근 제한 확인

---

## 테스트 7.1 Supplier 권한 제한

Supplier

금지


RFQ 생성
공급사 선택
RFQ 완료


---

## 테스트 7.2 Requester 권한

Requester

가능


RFQ 생성
공급사 선택
RFQ 완료


---

# 8. Sealed Bidding Test

목적

입찰 비공개 정책 검증

---

## Supplier View

확인


다른 공급사 존재 여부
가격
공급 대수


모두 비공개

---

## Requester View

확인


공급사 존재
가격
공급 대수


확인 가능

---

# 9. Error Handling Test

검증

---

## 잘못된 RFQ ID

API


/api/rfqs/invalid-id


기대 결과


404 error


---

## 잘못된 route_id

supplier submit

기대 결과


400 error


---

## 잘못된 가격

음수 가격

기대 결과


validation error


---

# 10. Edge Case Test

검증

| 케이스 | 기대 결과 |
|------|----------|
RFQ 취소 | 상태 cancelled |
마감일 초과 | 자동 in_review |
노선 0개 RFQ | 완료 가능 |
배차불가 | 가격 null |
공급대수 초과 | validation error |
중복 제출 | DB constraint |

---

# 11. 성능 및 안정성 테스트

확인

- RFQ 목록 로딩
- 비교 테이블 렌더링
- 대량 노선 처리
- API 응답 속도

---

# 12. 테스트 완료 기준

MVP 테스트 완료 기준

- 로그인 정상
- RFQ 생성 정상
- Supplier 제출 정상
- Requester 비교 정상
- RFQ 완료 정상
- sealed bidding 유지
- 권한 검증 정상