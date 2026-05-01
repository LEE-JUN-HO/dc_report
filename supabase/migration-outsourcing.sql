-- ============================================================
-- 월간 외주관리 마이그레이션
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 후 실행
-- ============================================================

-- 1. 외주 인력 마스터
CREATE TABLE IF NOT EXISTS outsourcing_partners (
  id            TEXT        PRIMARY KEY,
  type          TEXT        NOT NULL CHECK (type IN ('partner', 'freelancer')),
  company       TEXT,
  name          TEXT        NOT NULL,
  grade         TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'ended')),
  contract_type TEXT,
  start_date    DATE,
  end_date      DATE,
  email         TEXT,
  note          TEXT,
  sort_order    INTEGER     DEFAULT 99,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 월별 빌링 기록
CREATE TABLE IF NOT EXISTS outsourcing_records (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     TEXT        NOT NULL REFERENCES outsourcing_partners(id) ON DELETE CASCADE,
  month_id       TEXT        NOT NULL,           -- 예: '2026-01'
  billing_status TEXT        DEFAULT 'billing'
                             CHECK (billing_status IN ('billing', 'absence', 'standby')),
  revenue        NUMERIC,                        -- 매출액 (원)
  cost           NUMERIC,                        -- 매입액 (원)
  project        TEXT,                           -- 프로젝트 / 고객사명
  note           TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (partner_id, month_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_outsourcing_records_partner ON outsourcing_records(partner_id);
CREATE INDEX IF NOT EXISTS idx_outsourcing_records_month   ON outsourcing_records(month_id);

-- RLS 활성화
ALTER TABLE outsourcing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE outsourcing_records  ENABLE ROW LEVEL SECURITY;

-- 읽기/쓰기 정책 (schema.sql 패턴과 동일)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outsourcing_partners' AND policyname = 'public_read_outsourcing_partners'
  ) THEN
    CREATE POLICY "public_read_outsourcing_partners"
      ON outsourcing_partners FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outsourcing_partners' AND policyname = 'public_write_outsourcing_partners'
  ) THEN
    CREATE POLICY "public_write_outsourcing_partners"
      ON outsourcing_partners FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outsourcing_records' AND policyname = 'public_read_outsourcing_records'
  ) THEN
    CREATE POLICY "public_read_outsourcing_records"
      ON outsourcing_records FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outsourcing_records' AND policyname = 'public_write_outsourcing_records'
  ) THEN
    CREATE POLICY "public_write_outsourcing_records"
      ON outsourcing_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 확인용 쿼리
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('outsourcing_partners','outsourcing_records');
