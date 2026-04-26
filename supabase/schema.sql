-- ============================================================
-- Resource Hub — Supabase 스키마
-- Status(2026) 엑셀 기반
-- 버전: 1.0 | 2026-04-20
--
-- 사용법:
-- 1. Supabase 대시보드 → SQL Editor → New query
-- 2. 이 파일 전체 복사 → 붙여넣기 → Run
-- 3. 성공하면 seed.sql 실행 (초기 데이터)
-- ============================================================

-- 기존 테이블 삭제 (재실행 시)
drop table if exists utilization cascade;
drop table if exists pipeline cascade;
drop table if exists users cascade;
drop table if exists teams cascade;

-- ============================================================
-- 1. TEAMS — 9개 팀
-- ============================================================
create table teams (
  id         text primary key,              -- 'DM','DF','DS',...
  name       text not null,
  color      text not null,                 -- hex color
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. USERS — 47명 (재직/휴직/퇴사 포함)
-- ============================================================
create type user_status as enum ('active', 'leave', 'resigned', 'pre_hire');
create type user_level  as enum ('본부장', '특급', '고급', '중급', '초급');

create table users (
  id          text primary key,              -- 'u001','u002',...
  name        text not null,
  team_id     text not null references teams(id) on delete restrict,
  level       user_level not null,
  status      user_status not null default 'active',
  is_manager  boolean default false,
  joined_at   date,
  resigned_at date,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index users_team_idx on users(team_id);
create index users_status_idx on users(status);

-- ============================================================
-- 3. UTILIZATION — 주별 가동률 (user × week)
-- 한 유저의 한 주는 하나의 행. client(고객사)와 value(빌링)가 있거나, note(사유)만.
-- ============================================================
create table utilization (
  user_id    text not null references users(id) on delete cascade,
  week_id    text not null,                  -- 'W1','W2',...,'W53'
  client     text,                           -- 고객사명 (nullable)
  value      numeric(3,2),                   -- 빌링 0.0 ~ 1.2 (nullable)
  note       text,                           -- '휴가','교육','구정(16~18)' 등
  updated_at timestamptz default now(),
  updated_by text,                           -- 누가 마지막 수정했는지 (optional)
  primary key (user_id, week_id)
);
create index utilization_week_idx on utilization(week_id);
create index utilization_client_idx on utilization(client);

-- ============================================================
-- 4. PIPELINE — 영업 파이프라인
-- ============================================================
create type pipeline_status as enum ('완료', '확정', '예정');
create type pipeline_kind   as enum ('SM', 'PoC', 'PJ', 'PJ(M)', 'PS', '운영');

create table pipeline (
  id          text primary key,              -- 'prj001',...
  priority    int not null default 99,       -- 99 / 55 / 1
  client      text not null,
  kind        pipeline_kind not null,
  status      pipeline_status not null,
  sales       text,
  pre_sales   text,
  start_date  date,
  end_date    date,
  mm          numeric(5,2),                  -- Man-Month
  members     text,                          -- 자유 텍스트 '허순구, 김진규 × 2명'
  note        text,
  slack_channel_id text unique,              -- Slack SV 채널 ID (optional)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index pipeline_status_idx on pipeline(status);
create index pipeline_sales_idx  on pipeline(sales);
create index pipeline_slack_channel_idx on pipeline(slack_channel_id);

-- ============================================================
-- 5. updated_at 트리거
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at      before update on users      for each row execute function set_updated_at();
create trigger utilization_updated_at before update on utilization for each row execute function set_updated_at();
create trigger pipeline_updated_at   before update on pipeline   for each row execute function set_updated_at();

-- ============================================================
-- 6. VIEW — 자주 쓰는 집계
-- ============================================================

-- 주간 전사 가동률 (재직자만)
create or replace view v_weekly_utilization as
select
  u.week_id,
  round(avg(coalesce(u.value, 0))::numeric, 4) as avg_utilization,
  count(*) as user_count,
  sum(case when coalesce(u.value, 0) > 1.0 then 1 else 0 end) as overload_count,
  sum(case when coalesce(u.value, 0) < 0.5 and u.note is null then 1 else 0 end) as under_count
from utilization u
join users usr on usr.id = u.user_id and usr.status = 'active'
group by u.week_id;

-- 팀별 주간 가동률
create or replace view v_team_weekly as
select
  usr.team_id,
  u.week_id,
  round(avg(coalesce(u.value, 0))::numeric, 4) as avg_utilization,
  count(*) as user_count
from utilization u
join users usr on usr.id = u.user_id and usr.status = 'active'
group by usr.team_id, u.week_id;

-- 개인별 주간 가동률 (빠른 조회용)
create or replace view v_user_weekly as
select
  u.user_id,
  u.week_id,
  coalesce(u.value, 0) as value,
  u.client,
  u.note
from utilization u;

-- ============================================================
-- 7. RLS (Row Level Security) — 공용 접근이지만 기본 방어
-- ============================================================
alter table teams       enable row level security;
alter table users       enable row level security;
alter table utilization enable row level security;
alter table pipeline    enable row level security;

-- 익명 포함 모두에게 read/write 허용 (로그인 없이 공용 접근 요구사항)
create policy "public_read_teams"     on teams       for select using (true);
create policy "public_write_teams"    on teams       for all    using (true) with check (true);

create policy "public_read_users"     on users       for select using (true);
create policy "public_write_users"    on users       for all    using (true) with check (true);

create policy "public_read_util"      on utilization for select using (true);
create policy "public_write_util"     on utilization for all    using (true) with check (true);

create policy "public_read_pipeline"  on pipeline    for select using (true);
create policy "public_write_pipeline" on pipeline    for all    using (true) with check (true);

-- ============================================================
-- 8. Realtime 활성화 (대시보드 변경사항 실시간 반영)
-- ============================================================
alter publication supabase_realtime add table utilization;
alter publication supabase_realtime add table pipeline;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table teams;

-- 끝. 이제 seed.sql 실행하세요.
