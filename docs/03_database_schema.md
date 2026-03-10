# Database Schema
Shuttle Partner Beta RFQ System

본 문서는 Shuttle Partner Beta RFQ System의 데이터베이스 구조를 정의한다.

Database: Supabase Postgres

설계 목표

- MVP 구현을 위한 단순한 구조
- RFQ 라이프사이클 명확화
- Supplier 제출 구조 단순화
- 명확한 노선 선택 로직
- 통계 계산이 가능한 데이터 구조

---

# 1. Core Domain Model

핵심 엔티티

- Company
- User Profile
- RFQ
- RFQ Date
- RFQ Route
- Supplier Submission
- Supplier Route Supply
- Supplier Route Price
- Route Selection
- Notification

---

# 2. Companies

Table: `companies`

참여 회사 정보

Columns

- id (uuid primary key)
- name (text)
- can_request (boolean)
- can_supply (boolean)
- is_active (boolean)
- created_at (timestamp)

설명

일부 회사는 Requester와 Supplier 역할을 동시에 수행할 수 있다.

---

# 3. User Profiles

Table: `user_profiles`

Supabase Auth 사용자와 연결된 사용자 프로필

Columns

- id (uuid primary key)
- auth_user_id (uuid)
- company_id (uuid references companies)
- public_phone (text)
- phone_consent_agreed (boolean)
- phone_consent_agreed_at (timestamp)
- created_at (timestamp)

Constraint


unique(company_id)


설명

회사당 계정은 1개만 존재한다.

---

# 4. Departure Points

Table: `departure_points`

출발지 마스터 데이터

Columns

- id (uuid primary key)
- name (text)
- region (enum: metro, local)
- created_at (timestamp)

---

# 5. RFQs

Table: `rfqs`

RFQ 요청서

Columns

- id (uuid primary key)
- title (text)
- concert_name (text)
- venue (text)

참조

- requester_company_id (uuid references companies)
- created_by_user_id (uuid references user_profiles)

상태 enum

- open
- in_review
- completed
- cancelled

시간 정보

- quote_deadline_at
- review_started_at
- completed_at
- cancelled_at

기타

- cancelled_reason
- closed_early_at
- list_visible_until_at
- created_at

---

# 6. RFQ Dates

Table: `rfq_dates`

RFQ의 날짜 단위

Columns

- id (uuid primary key)
- rfq_id (uuid references rfqs)
- service_date (date)
- sort_order (integer)

설명

RFQ는 여러 날짜를 가질 수 있다.

UI에서는 날짜 탭으로 표시된다.

---

# 7. RFQ Routes

Table: `rfq_routes`

날짜별 노선 정보

Columns

- id (uuid primary key)
- rfq_date_id (uuid references rfq_dates)

노선 정보

- departure_point_id (uuid references departure_points)
- destination (text)

시간

- arrival_time_round1 (time)
- arrival_time_round2 (time)
- return_departure_time (time)

버스 타입

- bus_type (enum)

가능 값


44_seat
31_seat
28_seat


필요 대수

- required_round_trip_count (integer)
- required_one_way_count (integer)

정렬

- sort_order (integer)

규칙


required_round_trip_count >= 0
required_one_way_count >= 0


---

# 8. Supplier Submissions

Table: `rfq_supplier_submissions`

Supplier RFQ 참여 기록

중요 규칙

Supplier는 **Submit 버튼을 누른 이후에만 DB에 생성된다**

Columns

- id (uuid primary key)
- rfq_id (uuid references rfqs)
- supplier_company_id (uuid references companies)
- submitted_by_user_id (uuid references user_profiles)
- submitted_at (timestamp)

Constraint


unique(rfq_id, supplier_company_id)


설명

Supplier는 RFQ당 1회만 제출 가능

---

# 9. Supplier Route Supply

Table: `rfq_supplier_route_supply`

Supplier가 노선별 공급 가능한 대수

Columns

- id (uuid primary key)
- supplier_submission_id (uuid references rfq_supplier_submissions)
- rfq_route_id (uuid references rfq_routes)

공급 대수

- supply_round_trip_count (integer)
- supply_one_way_count (integer)

연식

- vehicle_year (integer)

timestamps

- created_at (timestamp)

Constraint


unique(supplier_submission_id, rfq_route_id)


규칙

배차불가


supply_round_trip_count = 0
supply_one_way_count = 0


가격 입력 조건


supply_round_trip_count + supply_one_way_count ≥ 1


---

# 10. Supplier Route Price

Table: `rfq_supplier_route_prices`

Supplier 노선별 가격

Columns

- id (uuid primary key)
- supplier_submission_id (uuid references rfq_supplier_submissions)
- rfq_route_id (uuid references rfq_routes)

가격

- round_trip_price (integer)
- one_way_price (integer)

timestamps

- created_at (timestamp)

Constraint


unique(supplier_submission_id, rfq_route_id)


규칙

가격 null 허용 조건


배차불가인 경우만


즉


round_trip_price = null
one_way_price = null


가능

---

# 11. Route Selections

Table: `rfq_route_selections`

Requester 노선 선택 정보

Columns

- id (uuid primary key)
- rfq_route_id (uuid references rfq_routes)

선택 상태

enum selection_status


selected
none


선택 공급사

- selected_supplier_submission_id (uuid)

감사 정보

- selected_by_user_id
- selected_at

기본값


selection_status = none


설명

RFQ 생성 시 모든 노선에 대해 미리 생성된다.

---

# 12. RFQ Completion Rule

RFQ 완료 조건

모든 노선에 대해


selection_status = selected
OR
selection_status = none


---

# 13. RFQ Success / Fail Analytics

RFQ 성공 여부는 상태값이 아니다.

정의

Success RFQ


selection_status = selected
노선 ≥ 1


Fail RFQ


모든 노선 selection_status = none


관리자 통계용 계산 값이다.

---

# 14. Notifications

Table: `notifications`

앱 내부 알림

Columns

- id (uuid primary key)
- recipient_user_id (uuid references user_profiles)

알림 타입

enum notification_type


rfq_created
quote_submitted
rfq_cancelled
rfq_completed
supplier_selected


기타

- reference_id
- is_read
- read_at
- created_at

---

# 15. RFQ Visibility Policy

RFQ 목록 노출 정책

Visible


status = open
status = in_review


또는


status = completed
OR cancelled
AND current_time <= list_visible_until_at


그 외에는 RFQ 목록에서 숨김 처리

---

# 16. My RFQ Logic

Supplier My RFQ


rfq_supplier_submissions
WHERE supplier_company_id = current_company


Requester My RFQ


rfqs
WHERE requester_company_id = current_company


---

# 17. Index Recommendations

추천 인덱스

rfqs


(status, quote_deadline_at desc)
(requester_company_id, created_at desc)


rfq_supplier_submissions


(supplier_company_id)


notifications


(recipient_user_id, is_read, created_at desc)


---

# 18. Data Retention Policy

MVP에서는 데이터 삭제 없음

- RFQ 삭제 없음
- 취소된 RFQ 데이터 유지
- Supplier 제출 데이터 유지

---

# 19. Design Summary

이 데이터 구조는 다음을 보장한다.

- Supplier 제출 단순 구조
- 명확한 RFQ 상태 관리
- 노선별 공급 대수 관리
- 노선별 가격 정책 적용
- sealed bidding 정책 유지
- 통계 계산 가능 구조