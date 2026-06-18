-- 004_fix_users.sql — users 테이블 컬럼 수정
-- must_change_pin 추가, pin_hash 제거 (있는 경우)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_pin boolean NOT NULL DEFAULT true;

ALTER TABLE users
  DROP COLUMN IF EXISTS pin_hash;
