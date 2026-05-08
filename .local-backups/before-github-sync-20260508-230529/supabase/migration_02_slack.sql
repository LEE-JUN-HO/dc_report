-- migration_02_slack.sql
-- 파이프라인 테이블에 Slack 채널 ID 컬럼 추가
ALTER TABLE pipeline ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;
