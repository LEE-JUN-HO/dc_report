-- ============================================================
-- viewer 역할 추가 마이그레이션
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 후 실행
-- ============================================================

-- 1. profiles CHECK constraint에 'viewer' 추가
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'approved', 'admin', 'rejected', 'viewer'));

-- 2. handle_new_user 함수 업데이트
--    viewer@bigxdata.io → 즉시 viewer 상태
--    admin@bigxdata.io  → 즉시 admin 상태
--    그 외             → pending 상태
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
      WHEN NEW.email = 'admin@bigxdata.io'  THEN 'admin'
      WHEN NEW.email = 'viewer@bigxdata.io' THEN 'viewer'
      ELSE 'pending'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. notice_comments 테이블 (댓글 기능, 아직 없으면 생성)
CREATE TABLE IF NOT EXISTS notice_comments (
  id         BIGSERIAL   PRIMARY KEY,
  notice_id  BIGINT      NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  author     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notice_comments_notice_id ON notice_comments(notice_id);

-- notices 테이블에 author 컬럼 추가 (없으면)
ALTER TABLE notices ADD COLUMN IF NOT EXISTS author TEXT;

-- ============================================================
-- 4. viewer 계정 생성 방법 (두 가지 중 선택)
-- ============================================================

-- [방법 A] Supabase Dashboard > Authentication > Users > "Add user" 버튼
--   이메일: viewer@bigxdata.io
--   비밀번호: 원하는 비밀번호 (최소 6자 필요)
--   → 생성 후 아래 쿼리로 profiles 상태를 viewer로 강제 설정
--
-- UPDATE profiles SET status = 'viewer', name = '뷰어'
-- WHERE email = 'viewer@bigxdata.io';

-- [방법 B] SQL로 직접 생성 (비밀번호 해시 직접 삽입 — Dashboard 방법 권장)
-- ============================================================

-- 확인용 쿼리
-- SELECT id, email, name, status, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;
