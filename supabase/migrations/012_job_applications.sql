-- =============================================
-- 012_job_applications.sql — 직원 채용 지원 시스템
-- =============================================

-- 지원서 테이블: 학생이 회사에 직접 지원
CREATE TABLE IF NOT EXISTS job_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  motivation   text NOT NULL DEFAULT '',      -- 지원 동기 (내가 어떤 점에서 기여할 수 있는지)
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','hired','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, applicant_id)           -- 같은 회사에 중복 지원 불가
);

-- RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- 지원자: 자신의 지원서만 조회
CREATE POLICY "ja_applicant_select" ON job_applications
  FOR SELECT USING (applicant_id = auth.uid());

-- 지원자: 삽입 (자신만)
CREATE POLICY "ja_applicant_insert" ON job_applications
  FOR INSERT WITH CHECK (
    applicant_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'applicant'
  );

-- CEO: 자기 회사에 들어온 지원서 조회
CREATE POLICY "ja_ceo_select" ON job_applications
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'ceo')
  );

-- 시장(교사): 같은 반 지원서 전체 조회
CREATE POLICY "ja_mayor_all" ON job_applications
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'mayor'
  );
