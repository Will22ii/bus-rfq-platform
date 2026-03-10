-- Departure points seed (docs: 01_product_context.md, 03_database_schema.md)
-- Run after schema.sql. Idempotent: fixed UUIDs, ON CONFLICT skip.

INSERT INTO departure_points (id, name, region)
VALUES
  ('a0000001-0000-4000-8000-000000000001'::uuid, '잠실역', 'metro'),
  ('a0000001-0000-4000-8000-000000000002'::uuid, '서울역', 'metro')
ON CONFLICT (id) DO NOTHING;
