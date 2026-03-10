-- User profiles seed for Shuttle Partner RFQ testing
-- Requires: schema.sql, seed_companies.sql, and auth.users populated with these emails.
-- Do NOT create users in auth.users; only links existing auth users to companies.
-- Skips when a profile already exists for that auth_user_id OR for that company_id (one profile per company).

INSERT INTO user_profiles (auth_user_id, company_id, public_phone, phone_consent_agreed, phone_consent_agreed_at)
SELECT
  u.id,
  c.id,
  v.phone,
  true,
  now()
FROM (VALUES
  ('seoul@test.com', '서울고려', '010-1000-0001'),
  ('peace@test.com', '평화관광', '010-1000-0002'),
  ('kumkang@test.com', '금강고속관광', '010-1000-0003'),
  ('shinsegae@test.com', '신세계관광', '010-1000-0004'),
  ('ongil@test.com', '온길투어', '010-1000-0005'),
  ('dongyoung@test.com', '동영', '010-1000-0006'),
  ('shinyoung@test.com', '신영', '010-1000-0007'),
  ('kumho@test.com', '금호', '010-1000-0008'),
  ('cl@test.com', '씨엘', '010-1000-0009'),
  ('bs@test.com', 'BS관광', '010-1000-0010'),
  ('goodmorning@test.com', '굿모닝', '010-1000-0011'),
  ('kumkangbus@test.com', '금강', '010-1000-0012'),
  ('goldtower@test.com', '골드타워', '010-1000-0013')
) AS v(email, company_name, phone)
JOIN auth.users u ON u.email = v.email
JOIN companies c ON c.name = v.company_name
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.auth_user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.company_id = c.id);
