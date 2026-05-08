-- ============================================================
-- Resource Hub — 초기 시드 데이터
-- Status(2026) 엑셀 기반
-- schema.sql 실행 후 이 파일 실행
-- ============================================================

-- 기존 데이터 클리어 (재시드용)
truncate table utilization, pipeline, users, teams restart identity cascade;

-- ============================================================
-- TEAMS (9개)
-- ============================================================
insert into teams (id, name, color, sort_order) values
  ('DC', 'DC', '#1E293B', 0),  -- 본부
  ('DM', 'DM', '#6366F1', 1),
  ('DF', 'DF', '#0EA5E9', 2),
  ('DS', 'DS', '#10B981', 3),
  ('DP', 'DP', '#F59E0B', 4),
  ('DH', 'DH', '#8B5CF6', 5),
  ('DI', 'DI', '#EC4899', 6),
  ('DA', 'DA', '#14B8A6', 7),
  ('DO', 'DO', '#F97316', 8),
  ('DX', 'DX', '#64748B', 9);

-- ============================================================
-- USERS (47명)
-- ============================================================
insert into users (id, name, team_id, level, status, is_manager, joined_at, resigned_at, note) values
  -- DC 본부
  ('u001','허순구','DC','본부장','active', true,  null,         null,         '본부장'),
  -- DM
  ('u002','박혜주','DM','고급','active',   false, null,         null,         null),
  ('u003','최철호','DM','중급','active',   false, null,         null,         null),
  ('u004','남하영','DM','초급','active',   false, null,         null,         null),
  ('u005','임성아','DM','초급','resigned', false, null,         '2026-01-29', null),
  ('u006','최필수','DM','초급','active',   false, null,         null,         null),
  -- DF
  ('u007','김보람','DF','고급','active',   false, null, null, null),
  ('u008','장민정','DF','중급','active',   false, null, null, null),
  ('u009','최유정','DF','중급','active',   false, null, null, null),
  ('u010','박경우','DF','초급','active',   false, null, null, null),
  ('u011','정주연','DF','초급','active',   false, null, null, null),
  -- DS
  ('u012','김수년','DS','고급','active',   false, null, null, null),
  ('u013','장재은','DS','고급','resigned', false, null, '2026-04-10', null),
  ('u014','이민영','DS','초급','active',   false, null, null, null),
  ('u015','오지원','DS','초급','resigned', false, null, '2026-04-03', null),
  ('u016','윤정환','DS','초급','resigned', false, null, '2026-02-27', null),
  ('u017','이단디','DS','초급','active',   false, '2026-05-06', null, null),
  -- DP
  ('u018','최재원','DP','고급','active',   false, null, null, '9월 출산휴가 예정'),
  ('u019','이장욱','DP','초급','active',   false, null, null, null),
  ('u020','임지원','DP','초급','active',   false, null, null, null),
  ('u021','정소영','DP','초급','active',   false, null, null, null),
  ('u022','윤이나','DP','초급','active',   false, null, null, null),
  -- DH
  ('u023','강신환','DH','특급','active',   false, null, null, null),
  ('u024','원지윤','DH','특급','active',   false, null, null, null),
  ('u025','신민수','DH','특급','active',   false, null, null, null),
  ('u026','강창규','DH','특급','active',   false, null, null, null),
  ('u027','김형균','DH','특급','active',   false, '2026-01-05', null, null),
  -- DI
  ('u028','김진규','DI','고급','active',   false, null, null, null),
  ('u029','이지우','DI','중급','active',   false, null, null, null),
  ('u030','황세호','DI','초급','active',   false, null, null, null),
  ('u031','이재헌','DI','초급','active',   false, null, null, null),
  ('u032','김남민','DI','초급','active',   false, '2026-05-11', null, null),
  -- DA
  ('u033','김종호','DA','고급','active',   false, null, null, null),
  ('u034','김태규','DA','중급','active',   false, null, null, null),
  ('u035','문성경','DA','초급','active',   false, null, null, null),
  ('u036','차유림','DA','초급','active',   false, null, null, null),
  ('u037','모성유','DA','초급','active',   false, '2026-05-11', null, null),
  -- DO
  ('u038','신태영','DO','고급','active',   false, null, null, null),
  ('u039','양영기','DO','초급','active',   false, null, null, null),
  ('u040','김영주','DO','중급','resigned', false, null, '2026-04-08', null),
  ('u041','김명빈','DO','초급','active',   false, null, null, null),
  ('u042','김현욱','DO','중급','leave',    false, null, null, '~W16 휴직 후 복귀'),
  -- DX
  ('u043','강승일','DX','특급','active',   false, null, null, null),
  ('u044','이상재','DX','고급','active',   false, null, null, null),
  ('u045','이윤지','DX','초급','active',   false, null, null, null),
  ('u046','김서연','DX','중급','active',   false, '2026-01-19', null, null);

-- ============================================================
-- PIPELINE (37건)
-- ============================================================
insert into pipeline (id, priority, client, kind, status, sales, pre_sales, start_date, end_date, mm, members, note) values
 ('prj001', 99, 'SKC',                 'SM',    '완료', '윤종식', null,     '2026-03-04', '2026-03-31',   1, null,                                '2/23 js 3/4부터 투입. 계약 완료'),
 ('prj002', 99, '미래에셋자산운용',    'PoC',   '확정', '박치언', null,     '2026-03-14', '2026-03-29',   null, '김태규, 최진아(박혜주)',         '3/26 CE 추가요건으로 기간 연장'),
 ('prj003', 99, '다올저축은행',        'PoC',   '확정', '김지원', null,     '2026-03-15', '2026-03-29',   0.5, '이세영, 정소영(김보람)',         '3/28 JH 추가 요청으로 2~3일 추가계약'),
 ('prj004', 99, '메리츠화재',          'SM',    '확정', '박기열', null,     '2026-03-18', '2026-07-31',  16, '김용진, 천우범, 이민영, 임지원',  '3/25 SM 5차 연장 계약서 날인본 전달'),
 ('prj005', 99, 'UBASE',               'PJ',    '확정', '박기열', null,     '2026-03-20', '2026-05-07',   null, '김진규, 박경우',                 '3/14 JH 월~수 시작 가능성 높음'),
 ('prj006', 99, '포스코 광양',         'PoC',   '확정', '윤종식', null,     '2026-03-20', '2026-03-27',   0.15, '신민수, 최필수',                 '3/28 JH 타부서 요청으로 하루 연장'),
 ('prj007', 99, 'LG엔솔',              'PJ',    '완료', '박기열', null,     '2026-03-25', '2026-06-24',   null, '김진규, 최유정, 최필수',         '3/4 gy 25일 시작 확정'),
 ('prj008', 99, '삼성물산 패션부문',   'PJ',    '확정', '윤종식', null,     '2026-04-01', '2026-09-30',   null, '김보람, 이세영, 정소영',         '3/26 js 내부 보고 진행 중'),
 ('prj009', 99, '풀무원(음성공장)',    'PJ',    '확정', '박치언', null,     '2026-04-04', '2026-06-03',   4, '오로라, 곽다인',                    '4/3 CE 전사 투자 막혀 무기한 홀딩'),
 ('prj010', 99, '씨젠의료재단',        'PJ',    '확정', '박기열', null,     '2026-04-08', '2026-09-07',  20, '박혜주, 김태규, 최유정, 최진아',   '4/2 JH 내부 품의 완료. 4/4 투입 미팅'),
 ('prj011', 99, 'JB금융지주',          'PS',    '확정', '박치언', null,     '2026-04-12', '2026-04-25',   0.5, '이지우',                         '4/11 CE 4/12 착수'),
 ('prj012', 99, 'CJ대한통운 건설부문', 'PJ',    '확정', '박치언', null,     '2026-04-22', '2026-05-08',   0.5, '최철호',                         '4/19 CE 4/22 비상주 확정'),
 ('prj013', 99, '엔미디어플랫폼',      'PJ',    '확정', '김지원', null,     '2026-04-22', null,           2.5, '장채령, 윤한별(.5)',             '4/2 JW 초급 2MM + 디자인 0.5MM 협의'),
 ('prj014', 99, '우리금융지주',        'PJ',    '예정', '박치언', '김대중', '2026-05-01', '2026-10-30', 19, '3명 × 6개월',                       '4/26 dj Closed lost (태블로 전환 실패)'),
 ('prj015', 99, '신영증권',            'PoC',   '확정', '박치언', null,     '2026-05-03', '2026-05-10',   0.25, '최필수',                        '4/30 CE 방문 PoC 일정협의 완료'),
 ('prj016',  1, '로티',                'PJ',    '예정', '김지원', '이준호', '2026-05-13', '2026-07-12',   2, '오로라(1.5MM), 곽다인(0.5MM)',     '5/14 JH 로티 내부 사정으로 지연'),
 ('prj017', 99, 'SK온',                'PJ',    '확정', '윤종식', null,     '2026-05-16', '2026-08-30',   3.5, '원지윤, 최철호+윤한별',          '4/23 js 최철호 매니저 투입 가능'),
 ('prj018',  1, 'CJ대한통운 인사운영', 'PJ',    '예정', '박치언', null,     '2026-05-27', '2026-06-07',   0.5, '이지우(후보)',                   '5/9 CE 5/27 착수 협의 완료'),
 ('prj019',  1, 'LG에너지솔루션',      'PJ',    '확정', '이정철', '박기열', '2026-06-01', '2026-08-31',   5.5, '신민수, 이지우',                 '5/2 GY 6/1 착수 팔로업 중'),
 ('prj020',  1, 'SK하이닉스',          'PJ',    '확정', '윤종식', null,     '2026-06-01', '2026-12-31',  19, '이찬희, 김수년, 장채령',           '5/8 SM 프로필 전달'),
 ('prj021',  1, '미래에셋자산운용',    'PJ',    '예정', '박치언', '이준호', '2026-06-03', '2026-08-30',   3, 'TBD 1명',                          '5/14 6월 1주차 시작 논의 중'),
 ('prj022',  1, 'KT DS',               'SM',    '예정', '이정철', '박기열', '2026-06-03', '2026-09-30',   4, '허민',                             '5/7 JH 6/3 시작 예정'),
 ('prj023', 55, '아우디 (EY)',         'PJ(M)', '예정', '윤종식', null,     '2026-06-03', '2026-12-31',   6, '원지윤, 이수민',                   '4/17 js 결과 발표 대기'),
 ('prj024', 55, '아시아나항공',        'PJ',    '확정', '이정철', '박기열', '2026-06-03', '2026-12-31',  53, '허순구, 김진규, 김옥래 외 7명',    '5/2 GY 최유정→김미순 변경'),
 ('prj025', 55, 'SK매직',              '운영',  '확정', '윤종식', null,     '2026-06-10', '2026-12-31',   6, '이동인(BICNS)',                    '5/7 JH BICNS 인력으로 대체'),
 ('prj026',  1, '포스코 메타버스',     'PJ',    '예정', '윤종식', '이준호', '2026-06-15', '2026-12-31',  12, 'TBD 1명, 최필수',                   '5/2 js 6월 중순~7월 초 투입'),
 ('prj027', 55, '다우기술(키움증권)',  'PoC',   '예정', '박치언', null,     '2026-06-24', null,           null, null,                           '6월말 PoC 진행 가능성'),
 ('prj028',  1, '신한투자증권',        'PJ',    '확정', '박치언', '이준호', '2026-07-01', '2027-02-28',  10, '서동현, TBD, 최유정, 윤한별',      '4/25 CE 투입 일정 협의 완료'),
 ('prj029', 55, '전남대',              'PJ',    '예정', '정순보', null,     '2026-07-01', '2026-09-30',   4, '2명 × 2개월',                     '4/24 sb 대시보드 개발'),
 ('prj030', 55, '대성에너지',          'PJ',    '예정', '박기열', '이준호', '2026-07-01', null,           null, null,                           '3/28 JH 5월부터 정식 라이선스'),
 ('prj031',  1, '파라다이스',          'PJ',    '예정', '윤종식', '김대중', '2026-07-15', '2026-11-15',  15, 'TBD 3명',                          '5/7 JH 7/15 시작 예상'),
 ('prj032',  1, '현대해상화재',        'PJ',    '예정', '박치언', '김대중', '2026-08-01', '2026-10-31',  12, '김용진, 천우범, 박경우, TBD',      '5/7 CE 4명×3달 변경 확정'),
 ('prj033',  1, '포스코 광양',         'PJ',    '예정', '윤종식', '이준호', '2026-08-01', '2026-10-31',   9, '2~3명 × 3개월',                    '4/22 js 재무팀 미팅'),
 ('prj034', 55, 'MBC',                 'PJ(M)', '예정', '김지원', '이준호', '2026-08-01', '2026-11-30',   4, 'TBD 1명',                          '3/28 JY 4월 총선 지연, 5월초 착수'),
 ('prj035',  1, '다올저축은행',        'PJ',    '예정', '김지원', '이준호', '2026-08-05', '2026-11-29',   null, '최소 2명',                      '4/24 JW 7월초 시작 목표, 예산 2억'),
 ('prj036', 55, '새마을금고',          'PJ',    '예정', '박치언', null,     '2026-09-01', null,          80, '김용진, 천우범, 임지원',            '3/14 일정 밀릴 가능성'),
 ('prj037', 55, 'SKC',                 'PJ',    '예정', '윤종식', '이준호', '2026-06-03', '2026-10-04',  15, '최재원, TBD 3명',                   '5/14 JH 수행 결정 확률 50%');

-- ============================================================
-- UTILIZATION — 주간 가동률
-- 엑셀 원본을 그대로 반영. 행이 많아 별도 스크립트 권장 (generate_util.html 참고)
-- 아래는 핵심 케이스만; 전체는 앱에서 Export → import 권장
-- ============================================================

-- DM
-- 허순구 (u001)
insert into utilization (user_id, week_id, client, value, note) values
 ('u001','W1','이크레더블',1,null),('u001','W2','이크레더블',1,null),('u001','W3','이크레더블',1,null),
 ('u001','W4','이크레더블',1,null),('u001','W5','이크레더블',1,null),('u001','W6','이크레더블',1,null),
 ('u001','W8',null,null,'구정(16~18)'),
 ('u001','W9','이크레더블',1,null),('u001','W10','이크레더블',1,null),('u001','W11','이크레더블',1,null),
 ('u001','W12',null,null,'휴가'),('u001','W13',null,null,'휴가(~3/23)');

-- 박혜주 (u002) — W1~W23 새마을금고, W24~W26 휴가
insert into utilization (user_id, week_id, client, value)
select 'u002', 'W'||g, '새마을금고', 1 from generate_series(1,23) g;
insert into utilization (user_id, week_id, note) values
 ('u002','W24','휴가(프로젝트휴가)'),('u002','W25','(연차)휴가'),('u002','W26','휴가');

-- 최철호 (u003)
insert into utilization (user_id, week_id, client, value)
select 'u003', 'W'||g, '새마을금고', 1 from generate_series(1,23) g;
insert into utilization (user_id, week_id, note) values
 ('u003','W24','휴가'),('u003','W25','휴가'),('u003','W26','휴가');

-- 남하영 (u004)
insert into utilization (user_id, week_id, client, value)
select 'u004', 'W'||g, '새마을금고', 1 from generate_series(1,23) g;
insert into utilization (user_id, week_id, note) values
 ('u004','W24','휴가'),('u004','W25','휴가'),('u004','W26','휴가');

-- 임성아 (u005) — 퇴사
insert into utilization (user_id, week_id, client, value) values
 ('u005','W1','새마을금고',1),('u005','W2','새마을금고',1),('u005','W3','새마을금고',1);
insert into utilization (user_id, week_id, note) values ('u005','W4','퇴사(1/29)');

-- 최필수 (u006)
insert into utilization (user_id, week_id, client, value)
select 'u006', 'W'||g, '새마을금고', 1 from generate_series(1,23) g;
insert into utilization (user_id, week_id, note) values
 ('u006','W24','휴가(프로젝트휴가)'),('u006','W26','휴가');

-- DF
-- 김보람 (u007)
insert into utilization (user_id, week_id, client, value)
select 'u007', 'W'||g, 'Agent Works', 0 from generate_series(1,8) g;
insert into utilization (user_id, week_id, client, value) values
 ('u007','W9','이크레더블',0),('u007','W10','이크레더블',1);
insert into utilization (user_id, week_id, client, value)
select 'u007', 'W'||g, '삼성물산', 1 from generate_series(11,35) g;

-- 장민정 (u008) — 연중 신한투자증권
insert into utilization (user_id, week_id, client, value)
select 'u008', 'W'||g, '신한투자증권', 1 from generate_series(1,53) g;

-- 최유정 (u009)
insert into utilization (user_id, week_id, client, value)
select 'u009', 'W'||g, 'HMM', 1 from generate_series(1,5) g;
insert into utilization (user_id, week_id, note) values
 ('u009','W6','휴가'),('u009','W7','휴가');
insert into utilization (user_id, week_id, client, value)
select 'u009', 'W'||g, 'Fn', 1 from generate_series(8,14) g;
insert into utilization (user_id, week_id, client, value) values
 ('u009','W15','Fn',0.4),
 ('u009','W16','한국투자저축은행/동국실업/휴가',0);
insert into utilization (user_id, week_id, client, value)
select 'u009', 'W'||g, '삼성물산', 1 from generate_series(17,35) g;

-- 박경우 (u010)
insert into utilization (user_id, week_id, client, value)
select 'u010', 'W'||g, 'HMM', 1 from generate_series(1,10) g;
insert into utilization (user_id, week_id, client, value) values ('u010','W11',null,0);
insert into utilization (user_id, week_id, client, value)
select 'u010', 'W'||g, 'NH투자증권', 1 from generate_series(12,22) g;
insert into utilization (user_id, week_id, note) values ('u010','W23','휴가');
insert into utilization (user_id, week_id, client, value) values ('u010','W24','BNK(예정)',1);
insert into utilization (user_id, week_id, client, value)
select 'u010', 'W'||g, 'BNK', 1 from generate_series(25,36) g;

-- 정주연 (u011)
insert into utilization (user_id, week_id, client, value)
select 'u011', 'W'||g, 'HMM', 0 from generate_series(1,10) g;
insert into utilization (user_id, week_id, value, note) values
 ('u011','W11',0,'직무교육(3일)/휴가 2일'),
 ('u011','W12',0,'월드비전 제안준비'),
 ('u011','W13',0,'Snowflake 학습'),
 ('u011','W14',0,'Snowflake 시험(4/4)'),
 ('u011','W15',0,'SnP Core 자격취득'),
 ('u011','W16',0,'Agentworks 테스트'),
 ('u011','W17',0,'Agentworks/tableau next');
insert into utilization (user_id, week_id, client, value) values ('u011','W18','삼성물산',0.4);
insert into utilization (user_id, week_id, client, value)
select 'u011', 'W'||g, '삼성물산', 1 from generate_series(19,35) g;

-- DS
-- 김수년 (u012)
insert into utilization (user_id, week_id, client, value) values
 ('u012','W1','교육지원',0.4),
 ('u012','W2','가천대',0.2),('u012','W3','가천대',0.2),
 ('u012','W4','SK머티리얼즈',0.4);
insert into utilization (user_id, week_id, client, value)
select 'u012', 'W'||g, 'AXA', 1 from generate_series(5,19) g;
insert into utilization (user_id, week_id, client, value) values
 ('u012','W20','AXA 지원',1),('u012','W21','AXA 지원',1);

-- 장재은 (u013) — 퇴사
insert into utilization (user_id, week_id, client, value)
select 'u013', 'W'||g, 'SK렌터카', 1 from generate_series(1,14) g;
insert into utilization (user_id, week_id, client, value) values ('u013','W15','SK렌터카(4/3철수)',1);

-- 이민영 (u014)
insert into utilization (user_id, week_id, client, value)
select 'u014', 'W'||g, 'HMM', 0 from generate_series(1,4) g;
insert into utilization (user_id, week_id, client, value)
select 'u014', 'W'||g, 'AXA', 1 from generate_series(5,18) g;
insert into utilization (user_id, week_id, client, value) values ('u014','W19','AXA 지원',1);
insert into utilization (user_id, week_id, note) values ('u014','W20','휴가');
insert into utilization (user_id, week_id, client, value) values ('u014','W21','현대해상',1);

-- 오지원 (u015) - 퇴사
insert into utilization (user_id, week_id, client, value)
select 'u015', 'W'||g, 'HMM', 0 from generate_series(1,4) g;
insert into utilization (user_id, week_id, client, value)
select 'u015', 'W'||g, 'AXA', 1 from generate_series(5,13) g;
insert into utilization (user_id, week_id, client, value) values ('u015','W14','AXA',0.4);

-- 윤정환 (u016) - 퇴사
insert into utilization (user_id, week_id, client, value)
select 'u016', 'W'||g, '노루페인트', 1 from generate_series(1,7) g;
insert into utilization (user_id, week_id, note) values ('u016','W8','퇴사');

-- 이단디 (u017) - 5/6 입사
insert into utilization (user_id, week_id, client, value, note) values ('u017','W19','리만코리아',0.6,'5/6 입사');
insert into utilization (user_id, week_id, client, value)
select 'u017', 'W'||g, '리만코리아', 1 from generate_series(20,28) g;
insert into utilization (user_id, week_id, client, value)
select 'u017', 'W'||g, '리만코리아', 1 from generate_series(30,33) g;

-- DP
-- 최재원 (u018)
insert into utilization (user_id, week_id, client, value)
select 'u018', 'W'||g, 'HMM', 1 from generate_series(1,4) g;
insert into utilization (user_id, week_id, client, value)
select 'u018', 'W'||g, '노루페인트', 1 from generate_series(5,18) g;
insert into utilization (user_id, week_id, client, value) values ('u018','W19','노루페인트(연장가능성)',1);
insert into utilization (user_id, week_id, note) values ('u018','W24','휴가');
insert into utilization (user_id, week_id, note)
select 'u018', 'W'||g, '9월 출산휴가' from generate_series(36,40) g;

-- 이장욱 (u019), 임지원 (u020) — 연중 메리츠화재
insert into utilization (user_id, week_id, client, value)
select 'u019', 'W'||g, '메리츠화재', 1 from generate_series(1,53) g;
insert into utilization (user_id, week_id, client, value)
select 'u020', 'W'||g, '메리츠화재', 1 from generate_series(1,53) g;

-- 정소영 (u021)
insert into utilization (user_id, week_id, client, value)
select 'u021', 'W'||g, '새마을금고', 1 from generate_series(1,14) g;
insert into utilization (user_id, week_id, value, note) values
 ('u021','W15',0,'휴가'),
 ('u021','W19',0,'컨퍼런스');
insert into utilization (user_id, week_id, client, value) values
 ('u021','W16','AXA손보',0),('u021','W17','AXA',0),('u021','W18','AXA 지원',0);
insert into utilization (user_id, week_id, note) values ('u021','W20','휴가');
insert into utilization (user_id, week_id, client, value)
select 'u021', 'W'||g, '동양생명', 1 from generate_series(21,24) g;
insert into utilization (user_id, week_id, client, value) values ('u021','W25','동양생명',0.4);

-- 윤이나 (u022)
insert into utilization (user_id, week_id, client, value)
select 'u022', 'W'||g, '이크레더블', 0 from generate_series(1,3) g;
insert into utilization (user_id, week_id, client, value)
select 'u022', 'W'||g, '새마을금고', 1 from generate_series(4,11) g;
insert into utilization (user_id, week_id, client, value)
select 'u022', 'W'||g, '노루페인트', 1 from generate_series(12,18) g;
insert into utilization (user_id, week_id, client, value)
select 'u022', 'W'||g, '나이스정보통신', 1 from generate_series(20,26) g;

-- DH
-- 강신환 (u023)
insert into utilization (user_id, week_id, client, value)
select 'u023', 'W'||g, 'HMM', 1 from generate_series(1,11) g;
insert into utilization (user_id, week_id, value, note) values
 ('u023','W12',0,'휴가'),('u023','W14',0,'Agentworks 테스트');
insert into utilization (user_id, week_id, client, value) values
 ('u023','W13','Agent Works',0),
 ('u023','W15','LS+현대해상',0.4),
 ('u023','W16','현대해상',0),('u023','W17','현대해상',0),
 ('u023','W18','동국실업 PoC',0),
 ('u023','W19','현대해상+AXA',0),
 ('u023','W20','AXA 지원',0),('u023','W21','AXA 지원',0),
 ('u023','W22','AXA 지원',1);
insert into utilization (user_id, week_id, client, value)
select 'u023', 'W'||g, '동양생명', 1 from generate_series(23,27) g;
insert into utilization (user_id, week_id, client, value) values ('u023','W28','동양생명',0.4);

-- 원지윤 (u024)
insert into utilization (user_id, week_id, client, value)
select 'u024', 'W'||g, 'SK ON', 1 from generate_series(1,10) g;
insert into utilization (user_id, week_id, value, note) values ('u024','W11',0,'휴가');
insert into utilization (user_id, week_id, client, value) values
 ('u024','W12','하나증권 제안',0),('u024','W13','하나증권 제안',0),
 ('u024','W14','삼성자산운용/한국투자저축은행 PoC',0);
insert into utilization (user_id, week_id, client, value)
select 'u024', 'W'||g, 'SK렌터카', 1 from generate_series(15,25) g;
insert into utilization (user_id, week_id, client, value)
select 'u024', 'W'||g, 'SK ON', 1 from generate_series(41,53) g;

-- 신민수 (u025)
insert into utilization (user_id, week_id, client, value)
select 'u025', 'W'||g, '이크레더블', 1 from generate_series(1,5) g;
insert into utilization (user_id, week_id, client, value)
select 'u025', 'W'||g, '이크레더블', 0 from generate_series(6,14) g;
insert into utilization (user_id, week_id, client, value) values ('u025','W15','KB손해보험',0.6);
insert into utilization (user_id, week_id, client, value)
select 'u025', 'W'||g, 'KB손해보험', 1 from generate_series(16,22) g;
insert into utilization (user_id, week_id, note) values
 ('u025','W23','휴가'),('u025','W24','휴가'),('u025','W25','휴가');

-- 강창규 (u026)
insert into utilization (user_id, week_id, client, value)
select 'u026', 'W'||g, '이크레더블', 0 from generate_series(1,10) g;
insert into utilization (user_id, week_id, client, value)
select 'u026', 'W'||g, '코오롱', 1 from generate_series(11,45) g;

-- 김형균 (u027)
insert into utilization (user_id, week_id, value, note) values ('u027','W1',0,'입사');
insert into utilization (user_id, week_id, client, value) values
 ('u027','W2','Agent Works',0),('u027','W3','Agent Works',0),
 ('u027','W4','노루페인트',0),
 ('u027','W5','Fn/SKT',1),('u027','W6','Fn/SKT',1);
insert into utilization (user_id, week_id, client, value)
select 'u027', 'W'||g, 'Fn/A-W', 0.5 from generate_series(7,11) g;
insert into utilization (user_id, week_id, value, note) values
 ('u027','W14',0,'Agentworks 테스트'),('u027','W16',0,'Agentworks 테스트');
insert into utilization (user_id, week_id, client, value) values
 ('u027','W15','현대카드+아스트라제네카',0.5),
 ('u027','W17','현대카드 제안',0),('u027','W18','현대카드',0);

-- DI
-- 김진규 (u028)
insert into utilization (user_id, week_id, client, value)
select 'u028', 'W'||g, 'HMM', 1 from generate_series(1,7) g;
insert into utilization (user_id, week_id, value, note) values
 ('u028','W10',0,'휴가'),('u028','W11',null,null);
insert into utilization (user_id, week_id, client, value) values
 ('u028','W12','월드비전 제안/휴가',0),
 ('u028','W13','휴가/월드비전 제안',0),
 ('u028','W14','월드비전 제안',0),
 ('u028','W15','삼성로지텍',0.6);
insert into utilization (user_id, week_id, client, value)
select 'u028', 'W'||g, '삼성로지텍', 1 from generate_series(16,19) g;

-- 이지우 (u029)
insert into utilization (user_id, week_id, client, value)
select 'u029', 'W'||g, '새마을금고', 1 from generate_series(1,19) g;
insert into utilization (user_id, week_id, note) values
 ('u029','W22','휴가'),('u029','W23','휴가(6/8)');
insert into utilization (user_id, week_id, client, value)
select 'u029', 'W'||g, '신한투자증권', 1 from generate_series(27,53) g;

-- 황세호 (u030) — 연중 미래에셋증권
insert into utilization (user_id, week_id, client, value)
select 'u030', 'W'||g, '미래에셋증권', 1 from generate_series(1,53) g;

-- 이재헌 (u031)
insert into utilization (user_id, week_id, client, value)
select 'u031', 'W'||g, '노루페인트', 1 from generate_series(1,4) g;
insert into utilization (user_id, week_id, client, value)
select 'u031', 'W'||g, '코오롱', 1 from generate_series(6,14) g;
insert into utilization (user_id, week_id, client, value)
select 'u031', 'W'||g, '코오롱 인수인계', 0 from generate_series(15,16) g;
insert into utilization (user_id, week_id, client, value)
select 'u031', 'W'||g, 'KB손해보험', 1 from generate_series(17,27) g;

-- 김남민 (u032) — 5/11 입사
insert into utilization (user_id, week_id, client, value, note) values ('u032','W20','동양생명',1,'5/11 입사');
insert into utilization (user_id, week_id, client, value)
select 'u032', 'W'||g, '동양생명', 1 from generate_series(21,27) g;
insert into utilization (user_id, week_id, client, value) values ('u032','W28','동양생명',0.4);

-- DA
-- 김종호 (u033)
insert into utilization (user_id, week_id, client, value)
select 'u033', 'W'||g, '이크레더블', 1 from generate_series(1,10) g;
insert into utilization (user_id, week_id, value, note) values
 ('u033','W11',0,'휴가'),('u033','W12',0,'휴가(~3/25)');
insert into utilization (user_id, week_id, client, value) values
 ('u033','W13','현대카드+아스트라제네카',0.5),
 ('u033','W14','서브원',0.2);
insert into utilization (user_id, week_id, client, value)
select 'u033', 'W'||g, '서브원', 1 from generate_series(15,28) g;

-- 김태규 (u034)
insert into utilization (user_id, week_id, client, value)
select 'u034', 'W'||g, 'LS증권', 1 from generate_series(1,12) g;
insert into utilization (user_id, week_id, client, value)
select 'u034', 'W'||g, '코오롱', 1 from generate_series(13,51) g;

-- 문성경 (u035)
insert into utilization (user_id, week_id, client, value)
select 'u035', 'W'||g, '노루페인트', 1 from generate_series(1,18) g;
insert into utilization (user_id, week_id, client, value) values ('u035','W19','노루페인트(연장가능성)',1);

-- 차유림 (u036)
insert into utilization (user_id, week_id, client, value) values
 ('u036','W1','새마을금고',0),
 ('u036','W2','가천대',1);
insert into utilization (user_id, week_id, client, value)
select 'u036', 'W'||g, 'SK ON', 1 from generate_series(3,21) g;

-- 모성유 (u037) — 5/11 입사
insert into utilization (user_id, week_id, client, value, note) values ('u037','W20','나이스정보통신',1,'5/11 입사');
insert into utilization (user_id, week_id, client, value)
select 'u037', 'W'||g, '나이스정보통신', 1 from generate_series(21,27) g;

-- DO
-- 신태영 (u038), 양영기 (u039), 김명빈 (u041) — 연중 같은 고객
insert into utilization (user_id, week_id, client, value)
select 'u038', 'W'||g, 'SK디스커버리', 1 from generate_series(1,53) g;
insert into utilization (user_id, week_id, client, value)
select 'u039', 'W'||g, 'SKC', 1 from generate_series(1,53) g;
insert into utilization (user_id, week_id, client, value)
select 'u041', 'W'||g, 'LG화학', 1 from generate_series(1,53) g;

-- 김영주 (u040) - 퇴사
insert into utilization (user_id, week_id, client, value)
select 'u040', 'W'||g, 'SK ON', 1 from generate_series(1,14) g;
insert into utilization (user_id, week_id, client, value) values ('u040','W15','SK ON',0.4);
insert into utilization (user_id, week_id, note) values ('u040','W16','퇴사(4/8)');

-- 김현욱 (u042) - 휴직 → 복귀
insert into utilization (user_id, week_id, note)
select 'u042', 'W'||g, '휴직' from generate_series(1,16) g;
insert into utilization (user_id, week_id, client, value)
select 'u042', 'W'||g, '하나증권', 1 from generate_series(17,53) g;

-- DX
-- 이상재 (u044)
insert into utilization (user_id, week_id, client, value)
select 'u044', 'W'||g, '삼성전자', 0.5 from generate_series(1,12) g;
insert into utilization (user_id, week_id, client, value)
select 'u044', 'W'||g, '삼성전자/GS엠비즈', 1 from generate_series(13,14) g;
insert into utilization (user_id, week_id, client, value)
select 'u044', 'W'||g, '삼성전자', 0.5 from generate_series(15,53) g;

-- 이윤지 (u045)
insert into utilization (user_id, week_id, client, value) values
 ('u045','W1','월드비전/교육지원',0.65),
 ('u045','W2','월드비전',0.2);
insert into utilization (user_id, week_id, client, value)
select 'u045', 'W'||g, '월드비전/가천대', 1 from generate_series(3,7) g;
insert into utilization (user_id, week_id, client, value)
select 'u045', 'W'||g, '월드비전', 0.2 from generate_series(8,9) g;
insert into utilization (user_id, week_id, client, value)
select 'u045', 'W'||g, '월드비전/던롭', 0.5 from generate_series(10,47) g;
insert into utilization (user_id, week_id, client, value)
select 'u045', 'W'||g, '월드비전', 0.2 from generate_series(48,53) g;

-- 김서연 (u046) - 1/19 입사
insert into utilization (user_id, week_id, value, note) values
 ('u046','W3',0,'온보딩'),('u046','W4',0,'온보딩');

-- 강승일 (u043) - 기록 없음

-- ============================================================
-- 완료. 이제 앱에서 Supabase URL/KEY 붙여넣고 사용하면 됩니다.
-- ============================================================
