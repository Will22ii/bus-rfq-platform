-- Shuttle Partner Beta RFQ System
-- Database Schema for Supabase Postgres
-- Based on docs/03_database_schema.md

-- =============================================================================
-- ENUMs
-- =============================================================================

CREATE TYPE region_type AS ENUM ('metro', 'local');

CREATE TYPE rfq_status AS ENUM ('open', 'in_review', 'completed', 'cancelled');

CREATE TYPE bus_type AS ENUM ('44_seat', '31_seat', '28_seat');

CREATE TYPE selection_status AS ENUM ('selected', 'none');

CREATE TYPE notification_type AS ENUM (
  'rfq_created',
  'quote_submitted',
  'rfq_cancelled',
  'rfq_completed',
  'supplier_selected'
);

-- =============================================================================
-- Tables (creation order per docs/06_dev_plan.md)
-- =============================================================================

-- 1. Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  can_request boolean NOT NULL DEFAULT false,
  can_supply boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. User Profiles (1 account per company; 1:1 with Supabase Auth user)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  public_phone text,
  phone_consent_agreed boolean NOT NULL DEFAULT false,
  phone_consent_agreed_at timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

-- 3. Departure Points (master data)
CREATE TABLE departure_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region region_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. RFQs
CREATE TABLE rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  concert_name text NOT NULL,
  venue text NOT NULL,
  requester_company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
  status rfq_status NOT NULL DEFAULT 'open',
  quote_deadline_at timestamptz NOT NULL,
  review_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  closed_early_at timestamptz,
  list_visible_until_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. RFQ Dates (date tabs per RFQ)
CREATE TABLE rfq_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
  service_date date NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

-- 6. RFQ Routes (routes per date)
CREATE TABLE rfq_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_date_id uuid NOT NULL REFERENCES rfq_dates (id) ON DELETE CASCADE,
  departure_point_id uuid NOT NULL REFERENCES departure_points (id) ON DELETE RESTRICT,
  destination text NOT NULL,
  arrival_time_round1 time,
  arrival_time_round2 time,
  return_departure_time time,
  bus_type bus_type NOT NULL,
  required_round_trip_count integer NOT NULL DEFAULT 0,
  required_one_way_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  CHECK (required_round_trip_count >= 0),
  CHECK (required_one_way_count >= 0)
);

-- 7. Supplier Submissions (one per RFQ per supplier)
CREATE TABLE rfq_supplier_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
  supplier_company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  submitted_by_user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_company_id)
);

-- 8. Supplier Route Supply (supply counts per route per submission)
CREATE TABLE rfq_supplier_route_supply (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_submission_id uuid NOT NULL REFERENCES rfq_supplier_submissions (id) ON DELETE CASCADE,
  rfq_route_id uuid NOT NULL REFERENCES rfq_routes (id) ON DELETE CASCADE,
  supply_round_trip_count integer NOT NULL DEFAULT 0,
  supply_one_way_count integer NOT NULL DEFAULT 0,
  vehicle_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_submission_id, rfq_route_id),
  CHECK (supply_round_trip_count >= 0),
  CHECK (supply_one_way_count >= 0)
);

-- 9. Supplier Route Prices (price per route per submission)
CREATE TABLE rfq_supplier_route_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_submission_id uuid NOT NULL REFERENCES rfq_supplier_submissions (id) ON DELETE CASCADE,
  rfq_route_id uuid NOT NULL REFERENCES rfq_routes (id) ON DELETE CASCADE,
  round_trip_price integer,
  one_way_price integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_submission_id, rfq_route_id)
);

-- 10. Route Selections (requester choice per route; created with RFQ, default none)
CREATE TABLE rfq_route_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_route_id uuid NOT NULL REFERENCES rfq_routes (id) ON DELETE CASCADE,
  selection_status selection_status NOT NULL DEFAULT 'none',
  selected_supplier_submission_id uuid REFERENCES rfq_supplier_submissions (id) ON DELETE SET NULL,
  selected_by_user_id uuid REFERENCES user_profiles (id) ON DELETE SET NULL,
  selected_at timestamptz,
  UNIQUE (rfq_route_id),
  CHECK (
    (selection_status = 'none' AND selected_supplier_submission_id IS NULL)
    OR (selection_status = 'selected' AND selected_supplier_submission_id IS NOT NULL)
  )
);

-- 11. Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes (per docs/03_database_schema.md §17)
-- =============================================================================

CREATE INDEX idx_rfqs_status_quote_deadline
  ON rfqs (status, quote_deadline_at DESC);

CREATE INDEX idx_rfqs_requester_company_created
  ON rfqs (requester_company_id, created_at DESC);

CREATE INDEX idx_rfq_supplier_submissions_supplier_company
  ON rfq_supplier_submissions (supplier_company_id);

CREATE INDEX idx_notifications_recipient_read_created
  ON notifications (recipient_user_id, is_read, created_at DESC);

-- =============================================================================
-- Optional: useful indexes for common queries
-- =============================================================================

CREATE INDEX idx_rfq_dates_rfq_id ON rfq_dates (rfq_id);
CREATE INDEX idx_rfq_routes_rfq_date_id ON rfq_routes (rfq_date_id);
CREATE INDEX idx_rfq_supplier_route_supply_submission ON rfq_supplier_route_supply (supplier_submission_id);
CREATE INDEX idx_rfq_supplier_route_prices_submission ON rfq_supplier_route_prices (supplier_submission_id);
CREATE INDEX idx_rfq_route_selections_rfq_route_id ON rfq_route_selections (rfq_route_id);
