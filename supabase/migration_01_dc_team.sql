-- ============================================================
-- 마이그레이션 #1: DC 본부 추가 + 본부장 등급 추가
-- 이미 schema.sql + seed.sql을 실행한 분들만 이 파일 실행
-- Supabase → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

-- 1. user_level enum에 '본부장' 추가
alter type user_level add value if not exists '본부장' before '특급';

-- 2. DC 본부 팀 추가 (이미 있으면 skip)
insert into teams (id, name, color, sort_order)
values ('DC', 'DC', '#1E293B', 0)
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- 3. 허순구를 DC 본부로 이동 + 본부장으로 변경
update users
set team_id = 'DC',
    level = '본부장',
    is_manager = true,
    note = '본부장'
where id = 'u001';

-- 확인
select id, name, team_id, level, is_manager, note from users where id = 'u001';
select * from teams order by sort_order;
