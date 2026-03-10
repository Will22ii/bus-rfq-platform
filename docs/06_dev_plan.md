# Development Plan
Shuttle Partner Beta RFQ System

본 문서는 RFQ 플랫폼 MVP 구현을 위한 개발 계획을 정의한다.

목표

- 빠른 MVP 구현
- 단일 Next.js 애플리케이션
- Supabase 기반 데이터 및 인증
- 최소한의 구조로 RFQ 입찰 흐름 구현

---

# 1. Development Strategy

개발은 다음 순서로 진행한다.


Database
→ API
→ UI


이 순서를 따르는 이유

- 데이터 구조가 먼저 확정되어야 API 구현이 가능
- API가 안정되어야 UI 구현이 단순해짐
- Cursor가 단계적으로 코드 생성 가능

---

# 2. Repository Structure

추천 프로젝트 구조


app/
components/
features/
hooks/
lib/
supabase/
types/


설명

app  
Next.js App Router 페이지

components  
재사용 UI 컴포넌트

features  
도메인별 기능 모듈

hooks  
공통 React Hooks

lib  
유틸리티 및 helper

supabase  
Supabase 클라이언트

types  
TypeScript 타입

---

# 3. Database Implementation

STEP3 문서를 기반으로 Supabase Postgres 스키마를 생성한다.

추천 방식


SQL schema migration


이유

- Cursor 자동 생성 가능
- Git 관리 가능
- Supabase UI 의존 최소화

---

# 4. Database Setup Order

테이블 생성 순서


companies
user_profiles
departure_points

rfqs
rfq_dates
rfq_routes

rfq_supplier_submissions
rfq_supplier_route_supply
rfq_supplier_route_prices

rfq_route_selections

notifications


---

# 5. API Implementation

STEP4 API 설계를 기반으로 구현한다.

추천 구현 순서


create_rfq
get_rfqs
get_rfq_detail
supplier_submit
requester_compare
select_supplier
complete_rfq
my_rfq
notifications


---

# 6. Authentication Implementation

Supabase Auth 사용

로그인 방식


Email + Password


---

## Middleware

Next.js middleware에서


세션 확인


수행

미로그인 시


/login redirect


---

## API Authorization

API에서는 역할 검증 수행

예


Supplier는 RFQ 생성 불가
Requester만 공급사 선택 가능


---

# 7. Supplier Submission Logic

Supplier 제출 로직


RFQ 상세
→ 노선 입력
→ 가격 입력
→ 제출


---

## 서버 처리


1 supplier_submission 생성
2 route_supply 생성
3 route_price 생성
4 notification 생성 (선택)


---

## Validation

서버 검증


모든 노선 입력
공급대수 규칙
가격 규칙
supplier 1회 제출


---

# 8. Requester Selection Logic

Requester 비교 화면


RFQ Compare


Requester 기능


공급사 비교
노선별 공급사 선택
선택 안함 지정


---

## Selection Update


POST /api/routes/{route_id}/select


선택 변경은


심사중 상태에서 자유롭게 가능


---

# 9. RFQ Completion Logic

RFQ 완료 조건


모든 노선 selection 존재


서버 처리


rfq.status = completed
completed_at 기록


---

# 10. UI Implementation Order

UI 구현 순서


RFQ List
RFQ Create
RFQ Detail (Supplier)
RFQ Compare (Requester)
My RFQ
Admin


---

# 11. RFQ Detail Rendering

RFQ 상세 화면 구성


날짜 탭
노선 테이블
가격 테이블


Supplier View


노선 입력
가격 입력
제출


Requester View


공급사 비교
공급사 선택


---

# 12. Sealed Bidding Enforcement

Supplier 화면에서는

다음 정보가 절대 노출되지 않는다.


다른 supplier 존재 여부
다른 supplier 가격
다른 supplier 공급 대수


Supplier는


자기 입력 영역만 확인 가능


---

# 13. Status Management

코드 상태값


open
in_review
completed
cancelled


UI 표시


견적 접수중
심사 진행중
선택 완료
요청 취소


---

# 14. Error Handling

API 응답 구조


{
success: false,
message: "error message"
}


성공 응답


{
success: true,
data: {}
}


---

# 15. Concurrency Control

Supplier 중복 제출 방지

DB constraint


unique(rfq_id, supplier_company_id)


---

# 16. Notification Implementation

알림 구조


notifications table


알림 이벤트


RFQ 생성
견적 제출
RFQ 취소
RFQ 완료


알림은 MVP에서는


in-app only


---

# 17. Deployment

서비스 배포


Frontend: Vercel
Database/Auth: Supabase


---

# 18. MVP Development Scope

다음 기능은 MVP에서 제외한다.


결제
계약 관리
배차 관리
외부 메시지
평판 시스템


---

# 19. Implementation Summary

개발 흐름


1 Database 구축
2 API 구현
3 UI 구현
4 테스트
5 배포


이 계획을 따르면 RFQ 플랫폼 MVP를 빠르게 구현할 수 있다.