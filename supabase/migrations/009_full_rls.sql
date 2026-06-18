-- =============================================
-- 009_full_rls.sql — 신규 테이블 RLS
-- 006의 auth_class_id()/auth_role()/auth_company_id() 헬퍼 사용
-- =============================================

ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_uses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_research      ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_merges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_alerts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes      ENABLE ROW LEVEL SECURITY;

-- products: 같은 반 회사 상품 조회, CEO가 자기 회사 상품 관리
CREATE POLICY "products_select" ON products FOR SELECT USING (
  company_id IN (SELECT id FROM companies WHERE class_id = auth_class_id())
);
CREATE POLICY "products_write_ceo" ON products FOR ALL USING (company_id = auth_company_id());

-- requisitions
CREATE POLICY "req_select" ON requisitions FOR SELECT USING (
  company_id IN (SELECT id FROM companies WHERE class_id = auth_class_id())
);
CREATE POLICY "req_write_ceo" ON requisitions FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "req_update_mayor" ON requisitions FOR UPDATE USING (auth_role() = 'mayor');

-- facilities: 같은 반 조회, 공무원 관리
CREATE POLICY "fac_select" ON facilities FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "fac_write_officer" ON facilities FOR ALL USING (
  class_id = auth_class_id() AND auth_role() = 'officer'
);

-- facility_uses
CREATE POLICY "facuse_select" ON facility_uses FOR SELECT USING (
  facility_id IN (SELECT id FROM facilities WHERE class_id = auth_class_id())
);
CREATE POLICY "facuse_insert" ON facility_uses FOR INSERT WITH CHECK (company_id = auth_company_id());

-- city_research: 같은 반 조회, 본인 작성
CREATE POLICY "research_select" ON city_research FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "research_write_self" ON city_research FOR ALL USING (user_id = auth.uid());

-- word_merges: 같은 반 조회, 교사 관리
CREATE POLICY "merge_select" ON word_merges FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "merge_write_mayor" ON word_merges FOR ALL USING (
  class_id = auth_class_id() AND auth_role() = 'mayor'
);

-- concept_responses: 같은 반 조회, 본인 작성
CREATE POLICY "concept_select" ON concept_responses FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "concept_insert_self" ON concept_responses FOR INSERT WITH CHECK (user_id = auth.uid());

-- exchanges: 같은 반 조회, 공무원/CEO 기록
CREATE POLICY "exch_select" ON exchanges FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "exch_write" ON exchanges FOR ALL USING (class_id = auth_class_id());

-- inspection_reports: 같은 반 조회, 공무원 작성
CREATE POLICY "insp_select" ON inspection_reports FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "insp_insert_officer" ON inspection_reports FOR INSERT WITH CHECK (
  officer_id = auth.uid() AND auth_role() = 'officer'
);

-- officer_alerts: 같은 반 조회·갱신
CREATE POLICY "alert_select" ON officer_alerts FOR SELECT USING (class_id = auth_class_id());
CREATE POLICY "alert_update" ON officer_alerts FOR UPDATE USING (class_id = auth_class_id());

-- teacher_notes: 교사만
CREATE POLICY "note_select_mayor" ON teacher_notes FOR SELECT USING (auth_role() = 'mayor');
CREATE POLICY "note_write_mayor" ON teacher_notes FOR ALL USING (
  teacher_id = auth.uid() AND auth_role() = 'mayor'
);

-- realtime 추가
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE officer_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
