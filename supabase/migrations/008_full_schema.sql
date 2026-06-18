-- =============================================
-- 008_full_schema.sql — 나머지 전체 테이블
-- =============================================

-- 상품 (CEO 등록)
CREATE TABLE IF NOT EXISTS products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  stock         int  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sold          int  NOT NULL DEFAULT 0 CHECK (sold >= 0),
  price         int  NOT NULL CHECK (price > 0),
  price_history jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 품의서
CREATE TABLE IF NOT EXISTS requisitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  items         jsonb NOT NULL DEFAULT '[]',
  dropped_items jsonb NOT NULL DEFAULT '[]',   -- 기회비용
  total         bigint NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted','approved','rejected')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 공용 시설 (공무원 등록)
CREATE TABLE IF NOT EXISTS facilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        text NOT NULL,
  unit        text NOT NULL DEFAULT '회',
  price       int  NOT NULL CHECK (price >= 0),
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 시설 이용 내역
CREATE TABLE IF NOT EXISTS facility_uses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  memo         text,
  quantity     int  NOT NULL CHECK (quantity > 0),
  total_amount bigint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 도시 탐구
CREATE TABLE IF NOT EXISTS city_research (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  map_selected boolean NOT NULL DEFAULT false,
  specialties  text,
  strengths    text,
  oneliner     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 교사 단어 묶기
CREATE TABLE IF NOT EXISTS word_merges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  field      text NOT NULL,
  canonical  text NOT NULL,
  aliases    jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 개념 정착 응답
CREATE TABLE IF NOT EXISTS concept_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  stage      int,
  kind       text NOT NULL,
  prompt     text,
  answer     text,
  is_correct boolean,
  attempts   int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 교류
CREATE TABLE IF NOT EXISTS exchanges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  from_company uuid REFERENCES companies(id) ON DELETE CASCADE,
  to_company   uuid REFERENCES companies(id) ON DELETE CASCADE,
  give         text,
  want         text,
  thanks       text,
  status       text NOT NULL DEFAULT 'recorded',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 기업 시찰 보고서
CREATE TABLE IF NOT EXISTS inspection_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id        uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES companies(id) ON DELETE SET NULL,
  trigger_type    text NOT NULL DEFAULT 'voluntary'
                    CHECK (trigger_type IN ('budget_alert','stall_alert','exchange','voluntary')),
  budget_snapshot bigint,
  progress_status text CHECK (progress_status IN ('good','slow','problem')),
  observation     text,
  alert_delivered boolean NOT NULL DEFAULT false,
  note_to_mayor   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 공무원 알림
CREATE TABLE IF NOT EXISTS officer_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  officer_id    uuid REFERENCES users(id),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (alert_type IN ('budget','stall','exchange')),
  threshold_value int,
  resolved      boolean NOT NULL DEFAULT false,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 교사 순회 평가 메모
CREATE TABLE IF NOT EXISTS teacher_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_facilities_class ON facilities(class_id);
CREATE INDEX IF NOT EXISTS idx_inspection_class ON inspection_reports(class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_class ON officer_alerts(class_id, resolved);
CREATE INDEX IF NOT EXISTS idx_concept_user ON concept_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_class ON exchanges(class_id);
