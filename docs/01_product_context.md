# Product Context
Shuttle Partner Beta RFQ System

---

# 1. Product Overview

Shuttle Partner Beta RFQ System은  
카카오 T 셔틀 파트너사가 버스 차량을 요청하고 버스 회사들이 견적을 제출하여  
요청사가 견적을 비교하고 공급사를 선택할 수 있도록 하는 RFQ 기반 차량 견적 플랫폼이다.

이 서비스는 제한된 회사만 사용하는 **베타 운영 플랫폼**이며  
정식 서비스 출시 전 실제 운영 프로세스를 검증하는 것이 목적이다.

플랫폼은 다음 단계까지만 수행한다.

1. 차량 요청 생성
2. 공급사 견적 제출
3. 견적 비교
4. 공급사 선택
5. 공급사 연락처 공개

차량 계약 및 운행 관리는 플랫폼 외부에서 진행된다.

---

# 2. Platform Scope

이 플랫폼은 **폐쇄형 베타 서비스**이다.

참여 회사는 관리자에 의해 관리된다.

## Requester (차량 요청사)

- 서울고려
- 평화관광
- 금강고속관광
- 신세계관광
- 온길투어

## Supplier (버스 공급사)

- 동영
- 신영
- 금호
- 씨엘
- BS관광
- 굿모닝
- 금강
- 골드타워
- 서울고려
- 평화관광
- 금강고속관광
- 신세계관광
- 온길투어

일부 회사는 Requester와 Supplier 역할을 동시에 수행할 수 있다.

---

# 3. User Roles

플랫폼에는 두 가지 사용자 역할이 존재한다.

## Requester

차량 운행을 요청하는 회사

권한

- RFQ 생성
- RFQ 조회
- 공급사 견적 확인
- 노선별 공급사 선택

---

## Supplier

버스 차량을 제공하는 회사

권한

- RFQ 조회
- 견적 제출
- 자신이 제출한 견적 조회

Supplier는 **다른 공급사의 존재 여부 및 견적 정보를 볼 수 없다.**

---

# 4. Account Model

계정 정책

- 회사당 계정 1개
- Email + Password 로그인
- 관리자 승인 후 계정 생성

권한 유형

1. Requester + Supplier
2. Supplier only

Supplier only 계정에는 **RFQ 생성 버튼이 표시되지 않는다.**

---

# 5. Core Concepts

플랫폼의 핵심 개념은 다음과 같다.

---

## RFQ (Request for Quotation)

차량 운행 요청서

RFQ는 여러 날짜와 노선을 포함할 수 있다.

구조

RFQ  
→ 날짜 탭  
→ 노선 테이블

날짜는 UI에서 **탭 형태로 구분된다.**

예

3/18 | 3/19 | 4/04

---

## Route (노선)

각 노선은 다음 정보를 가진다.

- 운행 날짜
- 출발지
- 도착지
- 회차별 도착 시간
- 귀가행 출발 시간
- 버스 타입
- 왕복 필요 대수
- 편도 필요 대수
- 지역

버스 타입은 Requester가 선택한다.

가능 값

- 44인승
- 31인승
- 28인승

Supplier는 버스 타입을 변경할 수 없다.

---

## Supplier Quote (공급사 견적)

Supplier는 노선별로 다음 정보를 입력한다.

- 공급 왕복 대수
- 공급 편도 대수
- 버스 연식

입력 규칙

- 모든 노선에 대해 값 입력 필수
- 공급 왕복 대수 + 공급 편도 대수 ≥ 1
- 둘 다 0일 경우 **배차불가**로 처리

---

# 6. RFQ Creation Flow

RFQ 생성은 두 단계로 이루어진다.

### 1단계: RFQ 작성 화면

Requester만 접근 가능

입력 정보

- 공연명
- 행사장
- 날짜
- 노선
- 회차
- 시간
- 필요 차량 대수

작성 완료 후 RFQ는 수정할 수 없다.

작성 완료 시 RFQ 상태는 **open** 상태가 된다.

---

### 2단계: RFQ 상세 화면

RFQ 작성 완료 후 생성되는 화면

이 화면은

- Requester
- Supplier

모두 접근 가능하다.

Supplier는 이 화면에서 견적을 입력하고 제출할 수 있다.

---

# 7. RFQ Lifecycle

RFQ는 다음 상태를 가진다.

## open

공급사가 견적을 제출할 수 있는 상태

---

## 심사중

견적 접수 기간 종료 후 상태

Requester가 공급사를 선택하는 단계

---

## completed

Requester가 모든 노선에 대해

- 공급사 선택
또는
- 선택 안함

을 지정하고 완료한 상태

---

## cancelled

Requester가 RFQ를 취소한 상태

---

# 8. RFQ Timeline

RFQ 시간 흐름

RFQ 생성  
↓  
open  
↓  
견적 접수 종료  
↓  
심사중  
↓  
completed

견적 접수 기간

- Requester 설정
- 최대 5일

심사 기간

- 제한 없음

---

# 9. Supplier Participation

Supplier는 RFQ 상세 화면에서 견적을 입력한 후 **제출 버튼**을 눌러 RFQ 입찰에 참여한다.

특징

- Supplier는 자신의 견적만 볼 수 있다.
- 다른 Supplier의 존재 여부나 견적 정보는 확인할 수 없다.
- 제출 이후에는 수정할 수 없다.

RFQ 리스트에서는 **제출 완료 상태 표시**가 나타난다.

---

# 10. Price Policy

가격은 **노선별 가격 정책**을 따른다.

가격 구조

노선 | 왕복 공급가 | 편도 공급가

특징

- 노선 기준 가격
- RFQ 전체 기간 동일 가격
- 날짜와 무관

예

잠실  
왕복 600000  
편도 400000

---

# 11. Requester Visibility

Requester는 RFQ 상세 화면에서

- 모든 공급사 견적 비교
- 노선별 공급사 선택

을 수행할 수 있다.

비교 화면에서는 공급사 이름과 전화번호가 **마스킹 상태**로 표시된다.

---

# 12. RFQ Completion

RFQ는 다음 조건에서 완료된다.

모든 노선에 대해

- 공급사 선택
또는
- 선택 안함

이 지정된 경우

Requester가 완료 버튼을 누르면 RFQ 상태가 **completed**로 변경된다.

---

# 13. RFQ Success Metric

RFQ 완료 후 관리자 통계용으로 다음 분류가 존재한다.

Success RFQ

하나 이상의 노선에서 공급사가 선택된 경우

Fail RFQ

모든 노선이 선택 안함인 경우

---

# 14. Supplier Contact Disclosure

RFQ 완료 후

Requester는 선택된 공급사의 정보를 확인할 수 있다.

표시 정보

- 공급사 이름
- 공개 전화번호

예

서울고려 : 010-1234-5678

---

# 15. Phone Number Policy

모든 Supplier는 My Page에서 **공개 전화번호를 등록해야 한다.**

전화번호는

- RFQ 낙찰 시
- Requester에게 공개된다.

전화번호 입력 시 개인정보 수집 동의가 필요하다.

---

# 16. RFQ List

RFQ List는 공급사가 RFQ를 탐색하는 화면이다.

노출 상태

- open
- 심사중
- completed (10일)
- cancelled (10일)

10일 이후 RFQ는 목록에서 숨김 처리된다.

---

# 17. My RFQ

사용자가 참여한 RFQ 목록

Supplier

자신이 견적 제출한 RFQ

Requester

자신이 생성한 RFQ

Dual Role 계정은 두 목록을 전환할 수 있다.

---

# 18. Admin Page

관리자 페이지

접속 URL

/admin

Admin 기능

- 전체 RFQ 조회
- 전체 견적 조회
- 공급사 정보 확인
- RFQ 상태 조회
- 통계 확인

---

# 19. Platform KPI

베타 운영 KPI

- RFQ 채택률
- RFQ 생성 수
- RFQ 평균 견적 수