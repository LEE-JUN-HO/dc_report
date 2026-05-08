-- Existing database migration for Slack SV channel synchronization.
-- Run this once in Supabase SQL Editor if your pipeline table was created
-- before slack_channel_id was added to schema.sql.

alter table pipeline
  add column if not exists slack_channel_id text;

create unique index if not exists pipeline_slack_channel_unique_idx
  on pipeline(slack_channel_id)
  where slack_channel_id is not null;
