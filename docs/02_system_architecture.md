# 시스템 아키텍처
Shuttle Partner Beta RFQ System

---

# 1. 아키텍처 개요

본 프로젝트는 **단일 Next.js 애플리케이션**으로 구축한다.

하나의 애플리케이션 안에 다음 기능을 포함한다.

- 사용자 화면 (Requester / Supplier)
- 인증 처리
- RFQ 생성 및 조회
- 공급사 견적 제출
- 요청사 견적 비교 및 선택
- 관리자 페이지
- API 처리
- 데이터베이스 접근

목표

- MVP를 빠르게 구현
- 복잡한 인프라 없이 운영 가능
- 유지보수 단순화

---

# 2. 기술 스택

## Frontend

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

---

## Backend

Next.js Route Handlers를 사용한다.

백엔드 로직은 Next.js 내부에서 처리한다.

---

## Database

- Supabase Postgres

---

## Authentication

일반 사용자

- Supabase Auth
- 이메일 + 비밀번호 로그인

관리자

- 별도 로그인 페이지 사용


/admin-login


관리자는 **공용 비밀번호 방식**으로 로그인한다.

---

## Hosting

- Vercel (웹 애플리케이션)
- Supabase (DB 및 Auth)

---

# 3. 설계 원칙

시스템은 다음 원칙을 따른다.

1. MVP 구현 속도를 최우선으로 한다
2. 단일 애플리케이션 구조 유지
3. 과도한 추상화 금지
4. 사용자 역할(Requester / Supplier) 명확 분리
5. 권한 검증은 프론트와 백엔드 모두 수행
6. UI 문구는 한국어 사용
7. 코드 및 DB enum 값은 영어 사용
8. 관리자 기능은 일반 사용자 흐름과 분리
9. 비즈니스 상태는 명시적 값 사용

---

# 4. 라우팅 구조

Next.js App Router 기반

예상 라우트 구조


/login
/rfqs
/rfqs/[id]
/rfqs/new
/my
/mypage
/notifications
/admin-login
/admin
/admin/rfqs
/admin/rfqs/[id]


로그인 후


RFQ 목록 페이지


로 바로 이동한다.

역할 선택 화면은 존재하지 않는다.

---

# 5. 인증 모델

## 일반 사용자 인증

- 이메일
- 비밀번호

계정 생성은 관리자 승인 방식이다.

각 계정은 하나의 회사에 속한다.

계정 유형


requester_supplier
supplier_only


supplier_only 계정은 RFQ 생성 기능이 없다.

---

## 관리자 인증

관리자는 별도 로그인 페이지 사용


/admin-login


관리자 로그인은 일반 사용자 계정과 분리된다.

관리자는 공용 비밀번호 입력으로 로그인한다.

세션은 브라우저 새로고침 후에도 유지된다.

---

# 6. 권한 정책

권한 검증은 **프론트와 백엔드 모두 수행한다.**

---

## 프론트 권한 제어

예

- Supplier-only 계정은 RFQ 생성 버튼 표시되지 않음
- Requester 전용 기능 숨김
- My RFQ 화면에서 역할별 UI 분기

---

## 백엔드 권한 제어

예

- Supplier는 RFQ 생성 API 호출 불가
- Supplier는 다른 Supplier 견적 조회 불가
- Requester만 공급사 선택 가능
- RFQ 완료 후 선택된 공급사만 정보 공개

---

# 7. 도메인 구조

시스템의 핵심 도메인 객체


Company
User Account
RFQ
RFQ Date Group
RFQ Route
Supplier Submission
Supplier Route Supply
Supplier Route Price
Route Selection
Notification
Public Phone Number
Admin Metrics


중요

RFQ 성공/실패는 상태가 아니라 **통계 개념**이다.

---

# 8. 상태 언어 정책

DB / 코드


open
in_review
completed
cancelled


UI 표시


견적 접수중
심사중
완료
취소


---

# 9. RFQ 구조

RFQ는 다음 구조를 가진다.


RFQ
└ 날짜 탭
└ 노선 테이블


날짜는 **열이 아닌 탭** 형태로 UI에 표시된다.

예


3/18 | 3/19 | 4/04


---

# 10. RFQ 상세 화면 구조

RFQ 상세 화면은 두 가지 테이블로 구성된다.

---

## 노선 테이블

노선별 운행 정보


노선
1회차 도착시간
2회차 도착시간
복귀행 출발시간
버스타입
왕복 필요 대수
편도 필요 대수


Supplier 입력


공급 왕복 대수
공급 편도 대수
연식


---

## 가격 테이블

노선 기준 가격


노선
왕복 공급가
편도 공급가


특징

- 노선별 가격
- RFQ 전체 기간 동일 가격
- 날짜와 무관

---

# 11. Supplier 참여 모델

Supplier 참여 방식


RFQ 상세 화면
→ 견적 입력
→ 제출 버튼


특징

- 제출 시 DB 기록 생성
- 제출 후 수정 불가
- RFQ 리스트에 제출 완료 표시

draft 저장은 없다.

페이지 이탈 시 입력 데이터는 저장되지 않는다.

---

# 12. Supplier 가시성 정책

Supplier는 다음을 볼 수 없다.

- 다른 Supplier 존재 여부
- 다른 Supplier 견적
- 다른 Supplier 가격
- 다른 Supplier 이름
- 다른 Supplier 전화번호

즉 **sealed bidding 구조**다.

Supplier 화면에는


자기 입력 영역만 표시


된다.

---

# 13. Requester 비교 화면

Requester는 모든 Supplier 견적을 비교할 수 있다.

비교 구조

노선 테이블


노선
필요 대수
A 공급사
B 공급사
C 공급사
공급사 선택


가격 테이블


노선
A 공급사 가격
B 공급사 가격
C 공급사 가격


두 테이블을 함께 비교한다.

---

# 14. RFQ 완료 정책

RFQ 완료 조건

모든 노선에 대해


공급사 선택
또는
선택 안함


결정이 완료되어야 한다.

---

# 15. Supplier 연락처 공개 정책

RFQ 완료 후

선택된 공급사만


회사명
전화번호


공개된다.

선택되지 않은 공급사는 계속 마스킹 상태 유지.

---

# 16. 알림 구조

알림은 앱 내부 알림으로 제공된다.

예

- RFQ 생성
- Supplier 견적 제출
- RFQ 취소
- RFQ 완료

알림은 화면 상단의 **종 아이콘(Notification)**에서 확인 가능하도록 설계한다.

단, MVP에서는 구현 우선순위가 낮다.

---

# 17. 사용자 정보 구조

로그인 후 첫 화면


RFQ 목록


핵심 사용자 페이지


RFQ 목록
RFQ 상세
RFQ 생성
My RFQ
My Page
Notifications


---

# 18. My RFQ 구조

My RFQ는 사용자 참여 RFQ 목록이다.

Supplier


내가 제출한 RFQ


Requester


내가 생성한 RFQ


Dual Role 계정은 두 목록을 전환할 수 있다.

---

# 19. 관리자 페이지

관리자 페이지는 별도 로그인 사용


/admin-login


관리자 기능

- 모든 RFQ 조회
- 모든 견적 조회
- 공급사 정보 확인
- RFQ 상태 확인
- 통계 확인

---

# 20. 배포 구조

웹 애플리케이션


Vercel


데이터베이스 및 인증


Supabase


---

# 21. 프로젝트 구조

권장 구조


app/
components/
features/
lib/
types/
supabase/
hooks/


---

# 22. MVP 제외 범위

다음 기능은 MVP에서 제외

- 결제
- 계약 관리
- 배차 관리
- 문자 / 카카오 알림
- 평판 시스템
- 다계정 회사 구조

---

# 23. 아키텍처 요약

본 시스템은

- Next.js 단일 애플리케이션
- Supabase 기반 DB
- Tailwind UI
- sealed bidding 구조
- RFQ 중심 도메인 모델

을 기반으로 구축된다.