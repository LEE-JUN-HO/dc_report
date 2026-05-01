-- ============================================================
-- 인증 시스템 마이그레이션
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 후 실행
-- ============================================================

-- 1. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  name        TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'admin', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email  ON profiles(email);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책 (authenticated 사용자만 읽기/쓰기 가능)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'authenticated_read_profiles'
  ) THEN
    CREATE POLICY "authenticated_read_profiles"
      ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'authenticated_write_profiles'
  ) THEN
    CREATE POLICY "authenticated_write_profiles"
      ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. 신규 가입 자동 처리 함수
--    admin@bigxdata.io → 즉시 admin 상태
--    그 외 → pending 상태
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.email = 'admin@bigxdata.io' THEN 'admin'
      ELSE 'pending'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. 트리거 등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 확인용 쿼리
-- SELECT id, email, name, status, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;
