-- 018_siheung_test.sql — 시흥시 테스트 반 추가
-- Supabase SQL Editor에서 실행하세요.
-- 이미 존재하면 무시합니다 (멱등).

INSERT INTO classes (name, code, color, stage)
VALUES ('시흥시', '3643410', 'teal', 0)
ON CONFLICT (code) DO NOTHING;
