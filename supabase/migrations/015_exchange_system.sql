-- 교류 요청 카드: 회사가 등록하는 교류 제안 (뭘 줄 수 있는지 + 뭘 원하는지)
CREATE TABLE IF NOT EXISTS exchange_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  class_id    uuid        NOT NULL REFERENCES classes(id)   ON DELETE CASCADE,
  offer       text        NOT NULL CHECK (char_length(offer) BETWEEN 1 AND 100),
  want        text        NOT NULL CHECK (char_length(want)  BETWEEN 1 AND 100),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE exchange_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_cards_class_read" ON exchange_cards FOR SELECT
  USING (class_id IN (SELECT class_id FROM users WHERE id = auth.uid()));

CREATE POLICY "exchange_cards_ceo_insert" ON exchange_cards FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'ceo')
    AND class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "exchange_cards_ceo_update" ON exchange_cards FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'ceo'));

-- 교류 매칭: 공무원이 두 회사를 연결해 교류 성사
CREATE TABLE IF NOT EXISTS exchange_matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid        NOT NULL REFERENCES classes(id)   ON DELETE CASCADE,
  company_a   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_b   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  officer_id  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- 같은 쌍 중복 방지 (a<b 정규화는 앱에서 처리)
  UNIQUE(company_a, company_b)
);

ALTER TABLE exchange_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_matches_class_read" ON exchange_matches FOR SELECT
  USING (class_id IN (SELECT class_id FROM users WHERE id = auth.uid()));

CREATE POLICY "exchange_matches_officer_insert" ON exchange_matches FOR INSERT
  WITH CHECK (
    class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('officer', 'mayor')
    )
  );
