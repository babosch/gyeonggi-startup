-- 023: 업무일지 승인·반려·지급 상태
--
-- 업무일지(activity_logs, action='worklog')에 상태를 부여:
--   submitted : 학생이 제출(기본)
--   rejected  : 지급자가 반려(사유 feedback) → 학생이 수정해 재제출하면 다시 submitted
--   paid      : 지급자가 '승인하고 지급' → 잠금(반려 불가)
--
-- 급여는 paid가 아닌(submitted) 업무일지를 '승인하고 지급'할 때만 나간다.
-- 다른 action(reflection 등)은 status를 쓰지 않으므로 NULL 허용, CHECK 제약 없음.

-- status NULL은 코드에서 'submitted'로 취급하므로 기존 일지 backfill 불필요(스키마만 변경).
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS feedback text;

-- 학생이 자기 업무일지를 수정(반려 후 재제출)할 수 있게 UPDATE 권한 추가
DROP POLICY IF EXISTS "logs_update_self" ON activity_logs;
CREATE POLICY "logs_update_self" ON activity_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
