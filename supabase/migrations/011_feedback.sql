-- 011_feedback.sql — 교사 피드백
-- 학생 제출물(사업계획서·도시탐구·성찰)에 교사가 피드백을 남긴다.

ALTER TABLE business_plans ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE city_research  ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE reflections    ADD COLUMN IF NOT EXISTS feedback text;

-- 교사가 같은 반 제출물에 피드백을 쓸 수 있도록 update 정책 추가
CREATE POLICY "plans_feedback_mayor" ON business_plans
  FOR UPDATE USING (class_id = auth_class_id() AND auth_role() = 'mayor');
CREATE POLICY "research_feedback_mayor" ON city_research
  FOR UPDATE USING (class_id = auth_class_id() AND auth_role() = 'mayor');
CREATE POLICY "reflections_feedback_mayor" ON reflections
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE class_id = auth_class_id())
    AND auth_role() = 'mayor'
  );
