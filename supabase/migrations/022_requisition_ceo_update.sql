-- 022: CEO(학생)가 자기 회사 품의서를 수정할 수 있도록 RLS UPDATE 정책 추가
--
-- 버그: 기존엔 'req_update_mayor'(mayor만 UPDATE)만 있어서, 학생이
-- 임시저장(draft) 후 '제출하기'를 누르면 draft→submitted UPDATE가 RLS에 막혀
-- 조용히 실패(0건 수정)했다. 결과적으로 품의서가 draft로 남아 교사 화면에 안 보였다.
-- 회수(submitted→draft)도 같은 이유로 실패했다.
--
-- 안전장치: draft/submitted 상태인 자기 회사 품의서만 수정 가능.
--           승인/반려된 건은 건드릴 수 없고, status를 approved/rejected로 바꿀 수도 없음.

DROP POLICY IF EXISTS "req_update_ceo" ON requisitions;
CREATE POLICY "req_update_ceo" ON requisitions FOR UPDATE
  USING (company_id = auth_company_id() AND status IN ('draft', 'submitted'))
  WITH CHECK (company_id = auth_company_id() AND status IN ('draft', 'submitted'));
