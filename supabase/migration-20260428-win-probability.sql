-- Add win probability to pipeline rows.
-- Run once in Supabase SQL Editor before deploying the UI that saves this field.

alter table pipeline
  add column if not exists win_probability numeric(5,2);

alter table pipeline
  drop constraint if exists pipeline_win_probability_range;

alter table pipeline
  add constraint pipeline_win_probability_range
  check (win_probability is null or (win_probability >= 0 and win_probability <= 100));

create index if not exists pipeline_win_probability_idx
  on pipeline(win_probability);
