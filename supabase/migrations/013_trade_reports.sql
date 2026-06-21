-- =============================================
-- 013_trade_reports.sql — 이상 거래 보고서 + 워드 클라우드
-- =============================================

-- 이상 거래 보고서
CREATE TABLE IF NOT EXISTS trade_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  officer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
  item_name    text NOT NULL DEFAULT '',
  detail       text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','reviewed','resolved')),
  mayor_note   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE trade_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_officer_insert" ON trade_reports FOR INSERT
  WITH CHECK (officer_id = auth.uid() AND auth_role() = 'officer');
CREATE POLICY "tr_officer_select" ON trade_reports FOR SELECT
  USING (officer_id = auth.uid());
CREATE POLICY "tr_mayor_all" ON trade_reports FOR ALL
  USING (auth_role() = 'mayor');

-- 워드 클라우드 단어
CREATE TABLE IF NOT EXISTS wordcloud_words (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word       text NOT NULL CHECK (char_length(word) BETWEEN 1 AND 12),
  hidden     boolean NOT NULL DEFAULT false,  -- 교사가 숨김 처리
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wordcloud_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc_insert" ON wordcloud_words FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "wc_select" ON wordcloud_words FOR SELECT
  USING (class_id = auth_class_id());
CREATE POLICY "wc_mayor_update" ON wordcloud_words FOR UPDATE
  USING (auth_role() = 'mayor');
