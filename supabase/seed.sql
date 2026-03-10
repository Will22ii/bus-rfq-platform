-- 출발지 마스터 데이터 (departure_points)
-- schema 적용 후 실행

INSERT INTO departure_points (id, name, region)
VALUES
  (gen_random_uuid(), '잠실역', 'metro'),
  (gen_random_uuid(), '서울역', 'metro');
