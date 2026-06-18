-- 005_fix_rls.sql — users 자기 행 조회 정책 추가
-- 기존 same_class 정책은 순환 참조 문제가 있으므로
-- 자기 자신은 항상 볼 수 있는 단순 정책을 추가한다

CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());
