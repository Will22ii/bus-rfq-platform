# API Specification
Shuttle Partner Beta RFQ System

본 문서는 RFQ 플랫폼의 API 설계를 정의한다.

목표

- 명확한 RFQ 상태 전환
- Supplier 제출 로직 단순화
- 권한 기반 접근 제어
- sealed bidding 정책 유지

---

# 1. Authentication

모든 API는 Supabase Auth 세션을 기반으로 인증한다.

요청 헤더


Authorization: Bearer <supabase_access_token>


서버는 모든 요청에서 다음을 검증한다.

1. 사용자 로그인 상태
2. 사용자 회사 정보
3. 사용자 역할

---

# 2. RFQ 생성

## API


POST /api/rfqs


권한

Requester만 호출 가능

---

## Request

**concert_name** is **removed** from the create payload. Client sends title, venue, quote_deadline_at, dates only. Server persists `concert_name` in DB using `venue` when not provided (for backward compatibility with `rfqs.concert_name` NOT NULL).


{
title,
venue,
quote_deadline_at,
dates: [
{
service_date,
routes: [
{
departure_point_id,
destination,
arrival_time_round1,
arrival_time_round2,
return_departure_time,
bus_type,
required_round_trip_count,
required_one_way_count
}
]
}
]
}


---

## Server Process


1 RFQ 생성
2 rfq_dates 생성
3 rfq_routes 생성
4 rfq_route_selections 생성 (default = none)


---

## Validation

서버는 다음을 검증한다.


quote_deadline_at <= now + 5 days
required_round_trip_count >= 0
required_one_way_count >= 0


---

# 3. RFQ 목록 조회

## API


GET /api/rfqs


Supplier와 Requester 모두 호출 가능

---

## Server Query

RFQ List 노출 조건


status = open
OR status = in_review
OR current_time <= list_visible_until_at


---

## Response


[
{
id
title
concert_name
venue
status
quote_deadline_at
}
]


---

# 4. RFQ 상세 조회

## API


GET /api/rfqs/{rfq_id}


---

## Supplier View

Supplier는 다음 정보만 조회 가능


RFQ 정보
rfq_dates
rfq_routes
자신의 supplier_submission (존재할 경우)


Supplier는 다음 정보를 절대 볼 수 없다.


다른 supplier_submission
supplier 회사 정보
supplier 전화번호


---

## Requester View

Requester는 다음 정보를 조회 가능


RFQ 정보
rfq_dates
rfq_routes
모든 supplier_submission
route_supply
route_price
route_selection


---

# 5. Supplier 견적 제출

## API


POST /api/rfqs/{rfq_id}/submit


Supplier만 호출 가능

---

## Request


{
route_supplies: [
{
route_id,
supply_round_trip_count,
supply_one_way_count,
vehicle_year
}
],
route_prices: [
{
route_id,
round_trip_price,
one_way_price
}
]
}


---

## Validation

서버 검증 규칙

### 1 모든 노선 입력 필수


route_supplies.length == rfq_routes.length
route_prices.length == rfq_routes.length


---

### 2 공급 대수 규칙


supply_round_trip_count + supply_one_way_count >= 1
OR
배차불가 (0,0)


---

### 3 가격 규칙

가격 null 허용 조건


배차불가인 경우만


즉


round_trip_price = null
one_way_price = null


가능

---

### 4 공급 대수 제한


supply_round_trip_count <= required_round_trip_count
supply_one_way_count <= required_one_way_count


---

### 5 Supplier 제출 1회 제한


unique(rfq_id, supplier_company_id)


---

## Server Process


1 rfq_supplier_submissions 생성
2 rfq_supplier_route_supply 생성
3 rfq_supplier_route_prices 생성
4 notification 생성 (optional)


---

# 6. Requester 비교 조회

## API


GET /api/rfqs/{rfq_id}/compare


Requester만 호출 가능

---

## Response


{
routes: [],
supplier_submissions: [],
route_supply: [],
route_prices: [],
route_selections: []
}


---

## Masking Rule

RFQ 상태


open
in_review


Supplier 정보


company_name = masked
phone_number = masked


---

RFQ 상태


completed


선택된 supplier만


company_name 공개
phone_number 공개


---

# 7. 공급사 선택

## API


POST /api/routes/{route_id}/select


Requester만 호출 가능

---

## Request


{
supplier_submission_id
}


또는


{
selection: "none"
}


---

## Server Process


route_selection 업데이트
selected_by_user_id 기록
selected_at 기록


---

# 8. RFQ 완료

## API


POST /api/rfqs/{rfq_id}/complete


Requester만 호출 가능

---

## Validation

RFQ 완료 조건


모든 route_selection 존재


즉


selection_status = selected
OR
selection_status = none


---

## Server Process


rfq.status = completed
completed_at 기록


---

# 9. My RFQ (Supplier)

## API


GET /api/my/supplier-rfqs


---

## Query


rfq_supplier_submissions
WHERE supplier_company_id = current_company


---

# 10. My RFQ (Requester)

## API


GET /api/my/requester-rfqs


---

## Query


rfqs
WHERE requester_company_id = current_company


---

# 11. Notifications

## API


GET /api/notifications


Response


[
{
id
type
reference_id
created_at
is_read
}
]


---

# 12. Security Rules

서버는 다음 규칙을 반드시 강제한다.

---

## Supplier 접근 제한

Supplier는 다음을 조회할 수 없다.


다른 supplier_submission
다른 supplier 가격
다른 supplier 공급 대수


---

## Requester 권한

Requester만 다음 수행 가능


RFQ 생성
Supplier 선택
RFQ 완료


---

# 13. Race Condition Protection

Supplier 중복 제출 방지

DB constraint


unique(rfq_id, supplier_company_id)


---

# 14. Architecture Summary

API 구조는 다음을 보장한다.

- RFQ 상태 일관성
- Supplier 단일 제출 모델
- sealed bidding 정책
- 명확한 route selection 로직
- Requester 비교 기능
- 확장 가능한 알림 구조