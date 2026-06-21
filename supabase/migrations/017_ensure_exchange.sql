-- 017: exchange_cards / exchange_matches / exchange_logs 미생성 시 안전 생성
-- (015, 016이 이미 실행된 경우에도 오류 없이 실행 가능)

-- ── exchange_cards ──────────────────────────────────────────────
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

DO $$ BEGIN
  CREATE POLICY "exchange_cards_class_read" ON exchange_cards FOR SELECT
    USING (class_id IN (SELECT class_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_cards_ceo_insert" ON exchange_cards FOR INSERT
    WITH CHECK (
      company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'ceo')
      AND class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_cards_ceo_update" ON exchange_cards FOR UPDATE
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'ceo'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── exchange_matches ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid        NOT NULL REFERENCES classes(id)   ON DELETE CASCADE,
  company_a   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_b   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  officer_id  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_a, company_b)
);

ALTER TABLE exchange_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exchange_matches_class_read" ON exchange_matches FOR SELECT
    USING (class_id IN (SELECT class_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_matches_officer_insert" ON exchange_matches FOR INSERT
    WITH CHECK (
      class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('officer', 'mayor'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── exchange_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_logs (
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

DO $$ BEGIN
  CREATE POLICY "exchange_logs_select" ON exchange_logs
    FOR SELECT USING (class_id IN (SELECT class_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_logs_insert" ON exchange_logs
    FOR INSERT WITH CHECK (
      class_id IN (SELECT class_id FROM users WHERE id = auth.uid())
      AND officer_id = auth.uid()
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'officer')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_logs_delete" ON exchange_logs
    FOR DELETE USING (officer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX exchange_logs_company_idx ON exchange_logs(from_company_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX exchange_logs_class_idx ON exchange_logs(class_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
