-- Companies seed for Shuttle Partner RFQ testing
-- Run after schema.sql. Idempotent: fixed UUIDs, ON CONFLICT skip.

-- Requester companies (can_request=true, can_supply=true)
INSERT INTO companies (id, name, can_request, can_supply, is_active, created_at)
VALUES
  ('c1000001-0000-4000-8000-000000000001'::uuid, '서울고려', true, true, true, now()),
  ('c1000001-0000-4000-8000-000000000002'::uuid, '평화관광', true, true, true, now()),
  ('c1000001-0000-4000-8000-000000000003'::uuid, '금강고속관광', true, true, true, now()),
  ('c1000001-0000-4000-8000-000000000004'::uuid, '신세계관광', true, true, true, now()),
  ('c1000001-0000-4000-8000-000000000005'::uuid, '온길투어', true, true, true, now()),
  -- Supplier-only (can_request=false, can_supply=true)
  ('c1000001-0000-4000-8000-000000000006'::uuid, '동영', false, true, true, now()),
  ('c1000001-0000-4000-8000-000000000007'::uuid, '신영', false, true, true, now()),
  ('c1000001-0000-4000-8000-000000000008'::uuid, '금호', false, true, true, now()),
  ('c1000001-0000-4000-8000-000000000009'::uuid, '씨엘', false, true, true, now()),
  ('c1000001-0000-4000-8000-00000000000a'::uuid, 'BS관광', false, true, true, now()),
  ('c1000001-0000-4000-8000-00000000000b'::uuid, '굿모닝', false, true, true, now()),
  ('c1000001-0000-4000-8000-00000000000c'::uuid, '금강', false, true, true, now()),
  ('c1000001-0000-4000-8000-00000000000d'::uuid, '골드타워', false, true, true, now())
ON CONFLICT (id) DO NOTHING;
