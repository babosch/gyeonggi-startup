-- =============================================
-- 002_rls.sql — Row Level Security 정책
-- =============================================

ALTER TABLE classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections    ENABLE ROW LEVEL SECURITY;

-- ── classes ──────────────────────────────────
-- 누구나 읽기 (로그인 화면에서 반 목록 필요)
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (true);

-- 교사(mayor)만 수정
CREATE POLICY "classes_update_mayor" ON classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.class_id = classes.id
        AND u.role = 'mayor'
    )
  );

-- ── users ─────────────────────────────────────
-- 같은 반 구성원만 조회
CREATE POLICY "users_select_same_class" ON users
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM users WHERE id = auth.uid()
    )
  );

-- 본인만 수정 (닉네임, pin_hash 등)
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- 교사는 같은 반 전체 수정 가능 (역할 전직, PIN 초기화 등)
CREATE POLICY "users_update_mayor" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.class_id = users.class_id
        AND u.role = 'mayor'
    )
  );

-- ── companies ────────────────────────────────
CREATE POLICY "companies_select_same_class" ON companies
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "companies_update_ceo" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = companies.id
        AND u.role = 'ceo'
    )
  );

-- ── accounts ─────────────────────────────────
-- 같은 반 구성원 조회
CREATE POLICY "accounts_select_same_class" ON accounts
  FOR SELECT USING (true); -- 서버에서 필터링

-- ── transactions ─────────────────────────────
CREATE POLICY "transactions_select_same_class" ON transactions
  FOR SELECT USING (true); -- 서버에서 필터링

-- ── business_plans ────────────────────────────
CREATE POLICY "plans_select_same_class" ON business_plans
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "plans_insert_self" ON business_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "plans_update_self" ON business_plans
  FOR UPDATE USING (user_id = auth.uid());

-- 교사는 같은 반 전체 수정 (선정/취소)
CREATE POLICY "plans_update_mayor" ON business_plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.class_id = business_plans.class_id
        AND u.role = 'mayor'
    )
  );

-- ── activity_logs ─────────────────────────────
CREATE POLICY "logs_select_same_class" ON activity_logs
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "logs_insert_self" ON activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── reflections ───────────────────────────────
CREATE POLICY "reflections_select_same_class" ON reflections
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE class_id = (SELECT class_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "reflections_insert_self" ON reflections
  FOR INSERT WITH CHECK (user_id = auth.uid());
