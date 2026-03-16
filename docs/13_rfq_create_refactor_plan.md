# RFQ Create Flow — Architecture Analysis & Refactor Plan

This document analyzes the current RFQ creation UI, identifies design inconsistencies with the product specification, and proposes a refactoring plan. **No code is generated here**; it serves as the blueprint for implementation.

---

## ⚠️ Schedule = UI only (do not implement a schedule table)

**Schedules exist only in the UI layer.** The database has **no schedule table** and must never get one. Schedule groups are a UI abstraction for assigning arrival/return times to multiple dates; they are expanded into `dates[].routes[]` when building the API payload. **Do not implement a schedule table.**

---

## 0. Constraints (Must Be Respected)

Three constraints define the refactor boundary:

1. **Schedule groups exist only in the UI layer.**  
   The database schema has **no schedule table**. Schedules are a **UI abstraction** used to assign arrival/return times to multiple dates. When creating the RFQ payload, the client **expands** schedule groups into `dates[].routes[]`: for each date, the schedule assigned to that date supplies the times, and the UI emits one route object per selected departure point with those times (and Step 2 requirements) in the request.

2. **Step 2 UI must follow the UI specification.**  
   RFQ detail and editing use a **date-tab** structure (e.g. **3/10 | 3/11 | 3/12**). Step 2 must use the same pattern: **one tab per service date**; **each tab renders a single route table** (노선, 1회차 도착, 2회차 도착, 복귀행 출발, 버스타입, 왕복 필요, 편도 필요). Times in that table are read-only (from the schedule for that date); the user edits only bus type and required counts per route.

3. **API payload must remain unchanged.**  
   The request body shape is fixed: `arrival_time_round1`, `arrival_time_round2`, and `return_departure_time` **must still exist per route** in `dates[].routes[]`. The UI therefore **converts** schedule groups into route-level fields when building the request: for each (date, departure_point_id), the client looks up the schedule for that date, copies its times onto the route object, and adds bus_type and required counts from Step 2.

---

## 1. Problem Analysis

### 1.1 Current Implementation Summary

**Location:** `src/app/(main)/rfqs/new/page.tsx` (single page, step 1 / step 2 toggle).

**Current data model (UI):**

- **Step 1:** Single card with:
  - `concertName`, `title`, `venue` (labeled "출발지" in UI — incorrect)
  - `quoteDeadlineAt`
  - `selectedDates[]` (date strings, add-one-by-one)
  - `routes[]`: array of **RouteRow**, each with:
    - `departure_point_id`, `destination`
    - **`arrival_time_round1`, `arrival_time_round2`, `return_departure_time`** (per row)
    - `bus_type`, `required_round_trip_count`, `required_one_way_count`
- **Step 2:** Same `routes` shown per date tab; submit builds `dates[].routes[]` by **copying the same route rows to every date** (same times repeated per date).

**API consumed:** `POST /api/rfqs` — body is `dates[]` with `service_date` and `routes[]`; each route includes times, so the API accepts times per route per date.

### 1.2 Core Design Inconsistencies

| Issue | Current behavior | Intended (product) behavior |
|-------|------------------|-----------------------------|
| **Arrival/return times** | Entered **per route** (each row has its own 1회차/2회차/귀가 시간). | Times are **per schedule**, not per route. All routes on the same schedule share the same arrival/return times. |
| **Schedule vs date** | No schedule concept. One flat list of dates; same route list (with times) is duplicated for every date. | **Schedule groups** exist: multiple dates can share one schedule (same round count, same times). Different dates can have different schedules (e.g. Schedule A for 3/10–3/11, Schedule B for 3/12). |
| **Destination** | User types destination **per route** (each row has "도착지" input). | Destination = **venue** (single value for the RFQ). Routes = departure points only; destination is the same for all. |
| **concert_name** | Required field in UI and API. | To be **removed** from RFQ create flow per task (optional elsewhere if needed for display). |
| **"출발지" at top** | Single text field labeled "출발지" is used for **venue** (행사장). | Remove; venue is the single "행사장" field. Routes are selected from **departure_points** (출발지 마스터). |
| **Route selection** | User adds rows and picks **one** departure point per row from a dropdown; can repeat same point; destination typed per row. | Routes = **selection from departure_points** (checkbox grid), in two tabs: **Metro (수도권)** and **Local (지방)**. No per-route destination; venue is the destination. |
| **Step 2 content** | Step 2 is "confirm" only: same table (with times, bus type, counts) repeated per date tab. | Step 2 = **route requirement input**: table of routes with times **pre-filled from schedule**; user only fills **bus_type**, **required_round_trip_count**, **required_one_way_count**. No time editing in Step 2. |
| **Round count** | Implicit (two time inputs; no explicit "회차 수"). | Explicit **round count** (max 3); schedule defines round count and which arrival/return fields are used. |

### 1.3 Where Time Is Attached in the Codebase

- **UI state:** `RouteRow` in `page.tsx` (lines 31–40) includes `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` per row.
- **Step 1 table:** Columns "1회차 도착", "2회차 도착", "귀가 출발" are `Input type="time"` per route row (lines 322–345).
- **Payload:** `handleCreate` (lines 154–165) maps each `r` in `routes` to `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` per route, and sends the same `routes` array for **every** date in `dates[].routes`.
- **API:** `POST /api/rfqs` (route.ts) accepts `dates[].routes[]` with optional `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` and writes them to `rfq_routes` per row (denormalized). So the **backend stores** time per route; the refactor keeps that storage model but **changes where time is defined in the UI** (schedule only).

### 1.4 Where Step 1 and Step 2 Logic Are Mixed

- **Single route array** holds both “which departure points” and “times + bus type + counts”. There is no separate “schedule” object; no “route selection” vs “route requirements” split.
- **canGoStep2** validates title, concertName, venue, quoteDeadlineAt, dates, routes, and per-route required counts but does not validate schedule (round count, times).
- **Step 2** only re-displays the same data with no different editing model (times still conceptually per route).

---

## 2. Correct RFQ Creation Architecture

### 2.1 Schedules Are UI-Only (No DB Table)

- **Schedules** are a **UI-only abstraction**. The database has **no schedule table**.
- In the UI, a schedule is an object that: (a) is assigned a set of service dates, and (b) holds one set of arrival/return times (round count, arrival 1..N, return). Multiple dates can share one schedule (e.g. Schedule A for 3/10 and 3/11, Schedule B for 3/12).
- When building the **API payload**, the client **expands** schedules into the existing API shape: for each `service_date`, the UI determines which schedule applies to that date, then for each selected `departure_point_id` it emits a **route object** that includes `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` (copied from that schedule), plus `bus_type` and required counts from Step 2. So the **request** still has times **per route**; the UI is responsible for filling those route-level fields from the schedule for that date.

### 2.2 Domain Rules (from task and docs)

- **RFQ** has: title, venue, quote_deadline_at; no concert_name in create flow.
- **Service dates:** Multiple dates; can be continuous or not. Stored in `rfq_dates`.
- **Schedule groups (UI):** A schedule defines one set of times and is assigned to one or more dates. E.g. Schedule A → [3/10, 3/11]; Schedule B → [3/12]. Each date is assigned to exactly one schedule.
- **Routes:** Represent **departure points only**. Selected from `departure_points` (Metro / Local). **Destination = venue** for the whole RFQ.
- **Time rule:** Arrival and return times are identical for all routes on a given date (they come from that date’s schedule). The UI configures times once per schedule; when building the payload it copies those times onto every route object for that date.

### 2.3 Step 1 Output (UI State)

- **Basic:** `title`, `venue`, `quote_deadline_at`.
- **Service dates:** `serviceDates: string[]` (e.g. `["2026-03-10","2026-03-11","2026-03-12"]`).
- **Schedules (UI-only):** Array of schedule objects. Each has:
  - `id` (local UI id)
  - `assignedDates`: which service dates use this schedule (each date belongs to exactly one schedule)
  - `roundCount`: 1..3 in UI (see roundCount note below)
  - `arrivalTimeRound1`, `arrivalTimeRound2?`, `arrivalTimeRound3?` (depending on roundCount)
  - `returnDepartureTime`
- **Route selection:** Array or set of `departure_point_id` from `departure_points`. Destination = venue (not input per route).

**roundCount:** In the UI, roundCount max = 3. The database (03_database_schema) has only `arrival_time_round1` and `arrival_time_round2` on `rfq_routes`; there is no 3rd arrival time column. So **only the first 2 arrival times are persisted**; a 3rd round in the UI is for display/UX only and is not stored.

### 2.4 Step 2: Date Tabs + Route Table Per Tab (UI Spec)

- Step 2 **must** follow the UI specification: **date tab** structure.
- **Layout:** Tabs labeled by service date, e.g. **3/10 | 3/11 | 3/12**. **Each tab** renders **one route table**.
- **Table columns:** 노선 | 1회차 도착 | 2회차 도착 | 복귀행 출발 | 버스타입 | 왕복 필요 | 편도 필요.
- **Per tab (per date):** Rows = one per selected departure point (route). The times (1회차 도착, 2회차 도착, 복귀행 출발) are **read-only** and come from the **schedule assigned to that date**. The user edits only **버스타입**, **왕복 필요**, **편도 필요** per row.
- **Step 2 state:** Per (date, departure_point_id): `bus_type`, `required_round_trip_count`, `required_one_way_count`. Times are not stored in Step 2; they are read from the schedule for that date when rendering and when building the payload.
- **rfqRouteKey:** The pair (date, departure_point_id) corresponds to one logical route row and to one DB row: after creation, that row is identified by `rfq_date_id` (from the date) + `departure_point_id`. So the Step 2 state key is conceptually **rfqRouteKey = (service_date, departure_point_id)**, which maps to the persisted row in `rfq_routes` (via the date’s `rfq_date_id` and the route’s `departure_point_id`).

### 2.5 Payload Build: Schedule → Route-Level Fields

The **API request body is unchanged**: `dates[].routes[]` with each route containing `arrival_time_round1`, `arrival_time_round2`, `return_departure_time`, plus departure_point_id, destination, bus_type, required counts.

**Conversion in the UI when building the request:**

1. For each `service_date` in `serviceDates`:
   - Find the schedule assigned to that date (from Step 1 schedules).
   - For each `departure_point_id` in `selectedDeparturePointIds`:
     - Build one route object:
       - `departure_point_id`, `destination` (= venue)
       - `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` := **from that schedule** (schedule times copied to route-level)
       - `bus_type`, `required_round_trip_count`, `required_one_way_count` := **from Step 2** state for (this date, this departure_point_id)
2. Result: `dates: [ { service_date, routes: [ ... ] } ]` with times present **per route** as required by the API.

### 2.6 Persistence (DB Unchanged)

- **rfqs:** title, venue, quote_deadline_at.
- **rfq_dates:** One row per service date.
- **rfq_routes:** One row per (rfq_date_id, departure_point_id); columns include arrival_time_round1, arrival_time_round2, return_departure_time (filled from the payload, which the UI built from schedule + Step 2).

---

## 3. UI Component Plan

### 3.1 Components to Introduce

| Component | Responsibility |
|-----------|----------------|
| **RFQBasicInfo** | Title, venue (행사장), quote deadline. No concert_name, no top-level "출발지". |
| **ServiceDateSelector** | Multiple date selection; support range and/or discrete picks. Output: `selectedDates: string[]`. |
| **ScheduleGroupEditor** | Add/remove schedule groups (UI-only). Per schedule: assign dates, set round count (1..3), set arrival time(s) and return time. No route here. |
| **RouteSelector** | Load departure_points; show two tabs (Metro / Local); checkbox grid; output: `selectedDeparturePointIds: string[]`. Destination = venue (not input here). |
| **RFQCreateStep1** | Composes RFQBasicInfo, ServiceDateSelector, ScheduleGroupEditor, RouteSelector. Validates and outputs Step 1 state (basic, dates, schedules, route ids). "다음" → Step 2. |
| **RFQRouteRequirementTable** | Single route table: 노선 | 1회차 도착 | 2회차 도착 | 복귀행 출발 | 버스타입 | 왕복 필요 | 편도 필요. Time columns **read-only** (values passed in from schedule for that date); user edits only bus_type, required_round_trip_count, required_one_way_count per row. Rows = one per selected departure point. |
| **RFQCreateStep2** | Receives Step 1 state. **Follows UI spec date-tab structure:** one tab per service date (e.g. 3/10 | 3/11 | 3/12). **Each tab** renders **one** RFQRouteRequirementTable: times for that tab come from the schedule assigned to that date; route list = selectedDeparturePointIds. User fills requirements per (date, route); on submit, build payload by expanding schedules into route-level fields (see §2.5). |

### 3.2 Step 2 Layout (UI Spec Compliance)

- **Tabs:** One tab per `service_date` (e.g. 3/10 | 3/11 | 3/12), matching RFQ detail/editing.
- **Content per tab:** One route table only. Rows = selected departure points; columns = 노선, 1회차 도착, 2회차 도착, 복귀행 출발 (read-only from schedule for this date), 버스타입, 왕복 필요, 편도 필요 (editable).
- No nested schedule tabs; each date has exactly one schedule, so one table per tab is sufficient.

### 3.3 Page Structure

- **Page:** `src/app/(main)/rfqs/new/page.tsx` (or split into step1 / step2 routes if desired).
- **State:** One page with `step === 1 | 2` and shared state (Step 1 result passed to Step 2).
- **Flow:** Step 1 → Validate (dates, every date assigned to a schedule, at least one route selected, schedule times valid) → Step 2 → Date tabs + route table per tab → Submit builds payload by converting schedules to route-level times (§2.5) → POST /api/rfqs.

### 3.4 Data Flow (high level)

1. **Step 1**  
   User fills RFQBasicInfo, ServiceDateSelector, ScheduleGroupEditor, RouteSelector. On "다음", validate and store: `basic`, `serviceDates`, `schedules`, `selectedDeparturePointIds`. Each date must be assigned to exactly one schedule (UI-only).

2. **Step 2**  
   For each `service_date`, show one tab. Inside the tab: one route table; times = schedule for that date (read-only); rows = selected departure points; user edits bus_type and required counts per row. State: per (date, departure_point_id) → bus_type, required_round_trip_count, required_one_way_count.

3. **Submit**  
   For each date, get schedule for that date. For each selected departure_point_id, build one route object with: departure_point_id, destination = venue, **arrival_time_round1, arrival_time_round2, return_departure_time** from schedule, and bus_type, required counts from Step 2. Resulting `dates[].routes[]` matches current API contract (times per route).

---

## 4. API Payload Structure (Unchanged)

The **API request body remains unchanged** (04_api_spec). The server continues to receive:

```json
{
  "title", "concert_name", "venue", "quote_deadline_at",
  "dates": [
    {
      "service_date",
      "routes": [
        {
          "departure_point_id",
          "destination",
          "arrival_time_round1",
          "arrival_time_round2",
          "return_departure_time",
          "bus_type",
          "required_round_trip_count",
          "required_one_way_count"
        }
      ]
    }
  ]
}
```

**Constraint:** `arrival_time_round1`, `arrival_time_round2`, and `return_departure_time` **must still exist per route** in the request. There is no schedule object in the payload.

**UI responsibility:** The client **converts** schedule groups into these route-level fields when building the request:

- For each `service_date`, the UI knows which schedule (UI state) applies to that date.
- For each selected `departure_point_id`, the UI creates one route object and **copies** that schedule’s times into `arrival_time_round1`, `arrival_time_round2`, `return_departure_time` for that route.
- So all routes under the same date will have the same times in the payload (because they share that date’s schedule), but the API still receives times **per route** as today. No backend or contract change.

---

## 5. Refactor Strategy

### 5.1 Phases

1. **Document and align specs**  
   - Update 05_ui_spec.md (see Section 6) so that RFQ Create 1단계/2단계 explicitly describe schedule groups, route selection (Metro/Local checkboxes), and Step 2 as requirement-only table.
2. **Introduce Step 1 components and state**  
   - Add RFQBasicInfo, ServiceDateSelector, ScheduleGroupEditor, RouteSelector; no removal of old UI yet. Implement Step 1 state: basic, serviceDates, schedules, selectedDeparturePointIds. Validate Step 1.
3. **Implement Step 2 from new model**  
   - RFQRouteRequirementTable + RFQCreateStep2: consume Step 1 state; show read-only times from schedule; collect bus_type and required counts per (date, route). Build payload and call existing POST /api/rfqs (with optional concert_name handling).
4. **Wire flow and remove old flow**  
   - Replace current single-table Step 1 and confirm-only Step 2 with the new two-step flow; remove per-route time inputs and concert_name/top 출발지 from create flow.
5. **API**  
   - No change to POST /api/rfqs contract. Client builds the same body with per-route times (filled from schedule when constructing the payload).

### 5.2 Backward Compatibility

- **DB:** No schema change; no schedule table. `rfq_routes` still has arrival_time_round1/2, return_departure_time per row.
- **API:** Request body shape unchanged; times remain per route in the payload. The UI converts schedule groups into those route-level fields before sending. Existing GET/list/detail APIs remain unchanged.

---

## 6. UI Specification Updates Required

The following updates to **05_ui_spec.md** are recommended so the spec matches the refactor:

- **§3.1 RFQ 생성 1단계**
  - **Remove:** "공연명" from required inputs (or mark as optional/display-only).
  - **Clarify:** "행사장" = venue = single field; no separate "출발지" at top.
  - **Add:** Explicit **Schedule groups**: add schedule, assign dates to schedule, set round count (1..3), set arrival times and return time **per schedule** (not per route).
  - **Replace "노선 선택":** Describe **Route selector** as two tabs (Metro / Local), checkbox grid from departure_points; destination = venue (not input per route).
- **§3.2 RFQ 생성 2단계**
  - **Clarify:** 노선 테이블 shows **노선 | 1회차 도착 | 2회차 도착 | 복귀행 출발 | 버스타입 | 왕복 필요 | 편도 필요** with **times read-only** (from schedule); user edits only 버스타입, 왕복 필요, 편도 필요.
- **§3 (intro)**
  - State explicitly: "Arrival/return times are defined per **schedule**, not per route; routes only carry departure point and vehicle requirements."

---

## 7. Summary

| Item | Action |
|------|--------|
| **Constraints** | (1) Schedules are UI-only; no DB schedule table; payload built by expanding schedules into dates[].routes[]. (2) Step 2 uses date-tab structure (3/10 \| 3/11 \| 3/12), one route table per tab. (3) API payload unchanged; arrival_time_round1/2 and return_departure_time remain per route; UI converts schedule → route-level fields when building the request. |
| **Problem** | Times and destination are per-route in current UI; no schedule abstraction; Step 2 is confirm-only; concert_name and "출발지" misuse. |
| **Architecture** | Step 1: basic + dates + schedules (UI-only) + route selection. Step 2: date tabs, one route table per tab; times read-only from schedule, user edits bus type and required counts. Submit: for each date, schedule times copied onto each route object so payload still has times per route. |
| **Components** | RFQBasicInfo, ServiceDateSelector, ScheduleGroupEditor, RouteSelector, RFQCreateStep1, RFQRouteRequirementTable, RFQCreateStep2. |
| **Data flow** | Step 1 state (incl. schedules) → Step 2 (date tabs + table per tab) → build request by expanding schedules into route-level times + Step 2 requirements → POST /api/rfqs. |
| **API** | Request shape unchanged; client fills per-route times from schedule when building payload. |
| **Docs** | Update 05_ui_spec.md §3.1, §3.2, and intro as above. |

This completes the architecture analysis and refactor plan without implementing code.
