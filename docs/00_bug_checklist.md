12개 버그 체크리스트

(실전 QA 기준)

1️⃣ 동일 공급사 중복 제출
상황

Supplier가 RFQ 제출 버튼을 두 번 클릭

submit
submit

또는

새로고침 → 다시 제출
발생 문제
rfq_supplier_submissions

테이블에

같은 supplier 두 개 생성
해결

DB

UNIQUE (rfq_id, supplier_company_id)

API

이미 제출 여부 검사
2️⃣ RFQ 마감 후 제출
상황

Supplier가

마감 시간 이후

submit

발생 문제

마감 이후에도 견적 들어옴

해결

API 검증

if now > quote_deadline
→ reject
3️⃣ open 상태에서 requester 선택
상황

Requester가

open 상태

인데

공급사 선택 API 호출
문제

비딩 중 공급사 공개

해결

API 검증

status must be in_review
4️⃣ Supplier가 다른 RFQ route 제출
상황

RFQ A

route_id

RFQ B

route_id

Supplier가

RFQ A submit
하지만
RFQ B route_id 사용
문제

데이터 꼬임

해결

API

route_id belongs to rfq_id

검증

5️⃣ 공급 대수 초과
상황

Requester 필요

3대

Supplier 입력

5대
문제

비즈니스 로직 위반

해결

API

available_vehicle_count <= required_vehicle_count

검증

6️⃣ 배차불가 + 가격 입력
상황
왕복 = 0
편도 = 0

인데

가격 있음
문제

데이터 모순

해결

API

if unavailable
→ price null
7️⃣ RFQ 완료 상태 변경 오류
상황

Requester가

선택 안한 노선 있음

인데

complete API 호출
문제

RFQ incomplete 상태

해결

API

every route must have selection
8️⃣ Supplier 정보 유출
상황

Supplier가

RFQ 상세

조회

문제

다른 supplier

가격
대수
회사

보임

해결

API

supplier view mask
9️⃣ RFQ 목록 숨김 정책 실패
상황

RFQ

completed

10일 지남

문제

RFQ list 계속 표시

해결

쿼리

status in (open,in_review)
OR
now < list_visible_until_at
🔟 departure_points 없는 경우
상황

RFQ 생성

하지만

departure_points

없음

문제

노선 생성 실패

해결

API

departure_point_id exists

검증

11️⃣ Supplier가 자기 제출 수정
상황

Supplier

submit

후

다시 수정
문제

입찰 공정성 깨짐

해결

API

submission immutable
12️⃣ 동시 선택 race condition
상황

Requester가

두 브라우저

에서

선택 변경
문제

DB 상태 꼬임

해결

API

transaction

또는

last-write wins

정책 정의

추가로 자주 터지는 UI 버그 5개

이건 개발 단계에서 많이 나온다.

1. Dropdown id 표시

지금 네가 본 것

uuid 표시
2. 날짜 탭 상태 꼬임
3/18 입력
3/19 이동
3/18 값 사라짐
3. 노선 추가 state reset
+ 노선 추가

후

기존 값 사라짐
4. 가격 테이블 sync 오류

노선 추가 시

가격 테이블 업데이트 안됨
5. submit validation 오류

값 다 입력했는데

Please fill out this field

발생

실제 서비스에서 가장 위험한 버그 TOP 3

실제 운영에서 가장 큰 사고는 이것이다.

1️⃣ Supplier 정보 유출

→ sealed bidding 깨짐

2️⃣ RFQ 완료 후 수정

→ 계약 문제

3️⃣ 중복 제출

→ 가격 경쟁 깨짐