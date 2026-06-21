-- 교류 성사 일지: 공무원이 다른 반(도시) 기업 방문 후 작성
CREATE TABLE exchange_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  from_company_id uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  to_city_name    text        NOT NULL CHECK (char_length(to_city_name) BETWEEN 1 AND 50),
  to_company_name text        NOT NULL CHECK (char_length(to_company_name) BETWEEN 1 AND 100),
  give_text       text        NOT NULL CHECK (char_length(give_text) BETWEEN 1 AND 200),
  received_text   text        NOT NULL CHECK (char_length(received_text) BETWEEN 1 AND 200),
  officer_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes           text        CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exchange_logs ENABLE ROW LEVEL SECURITY;

-- 같은 반만 조회 가능
CREATE POLICY "exchange_logs_select" ON exchange_logs
  FOR SELECT USING (
    class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
  );

-- 공무원(officer)만 작성 (같은 반)
CREATE POLICY "exchange_logs_insert" ON exchange_logs
  FOR INSERT WITH CHECK (
    class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
    AND officer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'officer')
  );

-- 자신이 쓴 일지만 삭제 가능
CREATE POLICY "exchange_logs_delete" ON exchange_logs
  FOR DELETE USING (officer_id = auth.uid());

-- 회사별 교류 건수용 인덱스
CREATE INDEX exchange_logs_company_idx ON exchange_logs(from_company_id);
CREATE INDEX exchange_logs_class_idx ON exchange_logs(class_id);
