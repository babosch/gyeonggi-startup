-- =============================================
-- 001_init.sql — 핵심 테이블 생성
-- =============================================

-- 반(도시)
CREATE TABLE classes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,           -- 예: 이천시
  code          text UNIQUE NOT NULL,    -- 로그인 코드
  color         text NOT NULL DEFAULT 'blue', -- 도시 컬러
  stage         int  NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 4),
  fair_mode     boolean NOT NULL DEFAULT false,
  paused        boolean NOT NULL DEFAULT false,
  notice        text,
  session_open  boolean NOT NULL DEFAULT false,
  hire_deadline timestamptz,
  budget_alert_pct  int NOT NULL DEFAULT 30,
  stall_alert_min   int NOT NULL DEFAULT 20,
  confirmed_research jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 사용자 (교사 + 학생 전체)
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  number         int  NOT NULL,          -- 학생 번호
  nickname       text,
  pin_hash       text NOT NULL,
  role           text NOT NULL DEFAULT 'applicant'
                   CHECK (role IN ('mayor','applicant','ceo','staff','officer')),
  company_id     uuid,                   -- 기업 소속 (CEO·직원만 있음)
  intro_seen     boolean NOT NULL DEFAULT false,
  reveal_pending text CHECK (reveal_pending IN ('ceo','staff','officer')),
  role_changes   jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, number)
);

-- 기업
CREATE TABLE companies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  icon         text NOT NULL DEFAULT '🏢',
  balance      bigint NOT NULL DEFAULT 0,
  grant_given  boolean NOT NULL DEFAULT false,
  open         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 외래키: users.company_id → companies
ALTER TABLE users ADD CONSTRAINT fk_users_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- 계좌 (회사·시청·개인 공용)
CREATE TABLE accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type   text NOT NULL CHECK (owner_type IN ('company','city','user')),
  owner_id     uuid NOT NULL,
  balance      bigint NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id)
);

-- 거래 내역
CREATE TABLE transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE,
  from_account_id uuid REFERENCES accounts(id),
  to_account_id   uuid REFERENCES accounts(id),
  amount          bigint NOT NULL CHECK (amount > 0),
  type            text NOT NULL CHECK (type IN (
                    'grant','purchase','payroll','facility',
                    'exchange','refund','adjust')),
  memo            text,
  reason          text,
  product_id      uuid,
  facility_id     uuid,
  voided          boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 사업계획서
CREATE TABLE business_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id        uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  content         jsonb NOT NULL DEFAULT '{}',
  reserve_amount  bigint NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','selected','rejected')),
  version         int  NOT NULL DEFAULT 0,
  submitted_at    timestamptz,
  selected_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 활동 로그 (과정중심평가)
CREATE TABLE activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  action     text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 성찰
CREATE TABLE reflections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage      int  NOT NULL,
  prompt     text,
  answer     text NOT NULL,
  mood       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_users_class_id     ON users(class_id);
CREATE INDEX idx_users_company_id   ON users(company_id);
CREATE INDEX idx_transactions_from  ON transactions(from_account_id);
CREATE INDEX idx_transactions_to    ON transactions(to_account_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
