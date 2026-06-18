-- =============================================
-- 006_rls_rewrite.sql — RLS 무한 재귀 해결
-- =============================================
-- 문제: users 정책 안에서 users를 서브쿼리로 조회하면
--       그 조회에도 RLS가 적용되어 무한 재귀 발생.
-- 해결: SECURITY DEFINER 헬퍼 함수로 재귀를 끊는다.
--       (DEFINER 함수는 RLS를 우회하여 실행됨)

-- ── 헬퍼 함수 ────────────────────────────────
CREATE OR REPLACE FUNCTION auth_class_id()
  RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public AS $$
    SELECT class_id FROM users WHERE id = auth.uid()
  $$;

CREATE OR REPLACE FUNCTION auth_role()
  RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public AS $$
    SELECT role FROM users WHERE id = auth.uid()
  $$;

CREATE OR REPLACE FUNCTION auth_company_id()
  RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public AS $$
    SELECT company_id FROM users WHERE id = auth.uid()
  $$;

-- ── 기존 정책 전부 제거 ──────────────────────
DROP POLICY IF EXISTS "classes_select"            ON classes;
DROP POLICY IF EXISTS "classes_update_mayor"      ON classes;
DROP POLICY IF EXISTS "users_select_self"         ON users;
DROP POLICY IF EXISTS "users_select_same_class"   ON users;
DROP POLICY IF EXISTS "users_update_self"         ON users;
DROP POLICY IF EXISTS "users_update_mayor"        ON users;
DROP POLICY IF EXISTS "companies_select_same_class" ON companies;
DROP POLICY IF EXISTS "companies_update_ceo"      ON companies;
DROP POLICY IF EXISTS "accounts_select_same_class" ON accounts;
DROP POLICY IF EXISTS "transactions_select_same_class" ON transactions;
DROP POLICY IF EXISTS "plans_select_same_class"   ON business_plans;
DROP POLICY IF EXISTS "plans_insert_self"         ON business_plans;
DROP POLICY IF EXISTS "plans_update_self"         ON business_plans;
DROP POLICY IF EXISTS "plans_update_mayor"        ON business_plans;
DROP POLICY IF EXISTS "logs_select_same_class"    ON activity_logs;
DROP POLICY IF EXISTS "logs_insert_self"          ON activity_logs;
DROP POLICY IF EXISTS "reflections_select_same_class" ON reflections;
DROP POLICY IF EXISTS "reflections_insert_self"   ON reflections;

-- ── classes ──────────────────────────────────
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (true);

CREATE POLICY "classes_update_mayor" ON classes
  FOR UPDATE USING (id = auth_class_id() AND auth_role() = 'mayor');

-- ── users ─────────────────────────────────────
-- 자기 행은 항상 조회 (재귀 없음 — 단순 비교)
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());

-- 같은 반 구성원 조회 (헬퍼 함수로 재귀 차단)
CREATE POLICY "users_select_same_class" ON users
  FOR SELECT USING (class_id = auth_class_id());

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_update_mayor" ON users
  FOR UPDATE USING (class_id = auth_class_id() AND auth_role() = 'mayor');

-- ── companies ────────────────────────────────
CREATE POLICY "companies_select_same_class" ON companies
  FOR SELECT USING (class_id = auth_class_id());

CREATE POLICY "companies_update_ceo" ON companies
  FOR UPDATE USING (id = auth_company_id() AND auth_role() = 'ceo');

-- ── accounts ─────────────────────────────────
CREATE POLICY "accounts_select_all" ON accounts
  FOR SELECT USING (true);

-- ── transactions ─────────────────────────────
CREATE POLICY "transactions_select_all" ON transactions
  FOR SELECT USING (true);

-- ── business_plans ────────────────────────────
CREATE POLICY "plans_select_same_class" ON business_plans
  FOR SELECT USING (class_id = auth_class_id());

CREATE POLICY "plans_insert_self" ON business_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "plans_update_self" ON business_plans
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "plans_update_mayor" ON business_plans
  FOR UPDATE USING (class_id = auth_class_id() AND auth_role() = 'mayor');

-- ── activity_logs ─────────────────────────────
CREATE POLICY "logs_select_same_class" ON activity_logs
  FOR SELECT USING (class_id = auth_class_id());

CREATE POLICY "logs_insert_self" ON activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── reflections ───────────────────────────────
CREATE POLICY "reflections_select_same_class" ON reflections
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE class_id = auth_class_id())
  );

CREATE POLICY "reflections_insert_self" ON reflections
  FOR INSERT WITH CHECK (user_id = auth.uid());
