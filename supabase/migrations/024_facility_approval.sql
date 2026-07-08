-- 024: 시설 사용 신청·승인 체계
--
-- 기존: CEO가 시설을 쓰면 즉시 과금 + 기록(승인 없음).
-- 변경: CEO가 '신청'(pending) → 공무원·시장이 '승인'(그때 과금) 또는 '반려'.
--
-- 기존 facility_uses 행은 이미 과금·사용 완료된 것이므로 DEFAULT 'approved'로 둔다
-- (새 신청만 코드에서 명시적으로 status='pending'으로 insert → 재과금 위험 없음).

ALTER TABLE facility_uses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE facility_uses ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE facility_uses ADD COLUMN IF NOT EXISTS feedback text;

-- 공무원·시장이 같은 반 시설 신청을 승인/반려(UPDATE)할 수 있게
DROP POLICY IF EXISTS "facuse_update_staff" ON facility_uses;
CREATE POLICY "facuse_update_staff" ON facility_uses FOR UPDATE
  USING (
    facility_id IN (SELECT id FROM facilities WHERE class_id = auth_class_id())
    AND auth_role() IN ('officer', 'mayor')
  );

CREATE INDEX IF NOT EXISTS idx_facility_uses_status ON facility_uses (status);
