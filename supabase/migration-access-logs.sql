-- ============================================================
-- 접속 로그 마이그레이션
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 후 실행
-- ============================================================

-- 1. 접속 로그 테이블
CREATE TABLE IF NOT EXISTS access_logs (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  name         TEXT,
  accessed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id     ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at DESC);

-- RLS 활성화
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- 본인만 삽입 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'access_logs' AND policyname = 'insert_own_access_log'
  ) THEN
    CREATE POLICY "insert_own_access_log"
      ON access_logs FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  -- admin/approved 사용자는 전체 조회 가능
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'access_logs' AND policyname = 'read_access_logs'
  ) THEN
    CREATE POLICY "read_access_logs"
      ON access_logs FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;
