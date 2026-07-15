-- 027: 5단계 "성찰" 추가
--
-- 1) classes.stage 제약을 0~5로 확장 (기존 CHECK는 0~4)
-- 2) 성찰 응답 테이블(reflection_responses) + 탭별 제출상태(reflection_tab_status)
-- 3) RLS: 학생은 자기 것만 읽기/쓰기, 교사(mayor)는 같은 반 전체 읽기
-- 4) Realtime publication 추가 (교사 실시간 모니터링)

-- ── 1) 단계 제약 확장 ─────────────────────────────
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_stage_check;
ALTER TABLE classes ADD CONSTRAINT classes_stage_check CHECK (stage BETWEEN 0 AND 5);

-- ── 2) 성찰 응답 (탭·필드 단위) ────────────────────
CREATE TABLE IF NOT EXISTS reflection_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tab_id     text NOT NULL,   -- consumer_review | consumer_deep | producer_review | producer_deep | concept_eval
  field_id   text NOT NULL,   -- 각 입력 필드 고유 키
  value      jsonb NOT NULL,  -- 텍스트/선택값/배열 등
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab_id, field_id)
);
CREATE INDEX IF NOT EXISTS idx_reflection_responses_class ON reflection_responses (class_id);
CREATE INDEX IF NOT EXISTS idx_reflection_responses_user  ON reflection_responses (user_id);

-- ── 탭별 제출 상태 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reflection_tab_status (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tab_id       text NOT NULL,
  submitted    boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab_id)
);
CREATE INDEX IF NOT EXISTS idx_reflection_tab_status_class ON reflection_tab_status (class_id);

-- ── 3) RLS ────────────────────────────────────────
ALTER TABLE reflection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_tab_status ENABLE ROW LEVEL SECURITY;

-- reflection_responses: 본인 전체 CRUD
DROP POLICY IF EXISTS "refl_resp_own" ON reflection_responses;
CREATE POLICY "refl_resp_own" ON reflection_responses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- reflection_responses: 같은 반 교사 읽기
DROP POLICY IF EXISTS "refl_resp_mayor_read" ON reflection_responses;
CREATE POLICY "refl_resp_mayor_read" ON reflection_responses
  FOR SELECT USING (class_id = auth_class_id() AND auth_role() = 'mayor');

-- reflection_tab_status: 본인 전체 CRUD
DROP POLICY IF EXISTS "refl_tab_own" ON reflection_tab_status;
CREATE POLICY "refl_tab_own" ON reflection_tab_status
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- reflection_tab_status: 같은 반 교사 읽기
DROP POLICY IF EXISTS "refl_tab_mayor_read" ON reflection_tab_status;
CREATE POLICY "refl_tab_mayor_read" ON reflection_tab_status
  FOR SELECT USING (class_id = auth_class_id() AND auth_role() = 'mayor');

-- ── 4) Realtime publication ───────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE reflection_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE reflection_tab_status;
