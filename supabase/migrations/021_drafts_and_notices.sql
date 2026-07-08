-- 021: 서류 임시저장(draft)·반려 사유 + 교사 공통사항 공유 게시판

-- ── 1. 품의서 임시저장(draft) 상태 + 반려 사유 ──────────────────────────
ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;
ALTER TABLE requisitions ADD CONSTRAINT requisitions_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));

ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS feedback text;

-- 사업계획서 status CHECK에는 이미 'draft','rejected'가 포함돼 있음(001_init).

-- ── 2. 교사 공통사항 공유 게시판 ───────────────────────────────────────
-- 모든 반 교사가 함께 보는 협의용 게시판.
-- visible_to_students: 추후 각 반 학생 공지배너로 노출할 글을 표시(현재 미사용, 확장 대비).
CREATE TABLE IF NOT EXISTS shared_notices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  author_city         text NOT NULL DEFAULT '',
  title               text NOT NULL DEFAULT '',
  body                text NOT NULL DEFAULT '',
  visible_to_students boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shared_notices ENABLE ROW LEVEL SECURITY;

-- 교사(mayor)는 모든 공통사항을 읽을 수 있음. (쓰기·삭제는 서버 admin 클라이언트로 처리)
DROP POLICY IF EXISTS "teachers read notices" ON shared_notices;
CREATE POLICY "teachers read notices" ON shared_notices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'mayor'
  ));

CREATE INDEX IF NOT EXISTS idx_shared_notices_created ON shared_notices (created_at DESC);
