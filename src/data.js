// 실제 데이터 (Status(2026) 엑셀 기반)
// 9팀, 47명 (재직/휴직/퇴사 모두 포함), 2026년 53주
// -------------------------------------------------------

// 팀 (엑셀 코드 + DC 본부)
const TEAMS = [
  { id: 'DC', name: 'DC', color: '#1E293B' },  // 본부 — 맨 위
  { id: 'DM', name: 'DM', color: '#6366F1' },
  { id: 'DF', name: 'DF', color: '#0EA5E9' },
  { id: 'DS', name: 'DS', color: '#10B981' },
  { id: 'DP', name: 'DP', color: '#F59E0B' },
  { id: 'DH', name: 'DH', color: '#8B5CF6' },
  { id: 'DI', name: 'DI', color: '#EC4899' },
  { id: 'DA', name: 'DA', color: '#14B8A6' },
  { id: 'DO', name: 'DO', color: '#F97316' },
  { id: 'DX', name: 'DX', color: '#64748B' },
];

// 등급 (엑셀 그대로 + 본부장)
const LEVELS = ['본부장', '특급', '고급', '중급', '초급'];

// 상태
const STATUSES = {
  active:    { label: '재직', color: '#10B981' },
  leave:     { label: '휴직', color: '#F59E0B' },
  resigned:  { label: '퇴사', color: '#94A3B8' },
  pre_hire:  { label: '입사예정', color: '#60A5FA' },
};

// 인원 (엑셀 원본 — 관리자 포함 47명)
const USERS = [
  // DC 본부 (1명)
  { id: 'u001', name: '허순구', team: 'DC', level: '본부장', status: 'active', isManager: true, note: '본부장' },
  // DM 5명 (허순구 제외)
  { id: 'u002', name: '박혜주', team: 'DM', level: '고급', status: 'active' },
  { id: 'u003', name: '최철호', team: 'DM', level: '중급', status: 'active' },
  { id: 'u004', name: '남하영', team: 'DM', level: '초급', status: 'active' },
  { id: 'u005', name: '임성아', team: 'DM', level: '초급', status: 'resigned', resignedAt: '2026-01-29' },
  { id: 'u006', name: '최필수', team: 'DM', level: '초급', status: 'active' },
  // DF 5명
  { id: 'u007', name: '김보람', team: 'DF', level: '고급', status: 'active' },
  { id: 'u008', name: '장민정', team: 'DF', level: '중급', status: 'active' },
  { id: 'u009', name: '최유정', team: 'DF', level: '중급', status: 'active' },
  { id: 'u010', name: '박경우', team: 'DF', level: '초급', status: 'active' },
  { id: 'u011', name: '정주연', team: 'DF', level: '초급', status: 'active' },
  // DS 6명
  { id: 'u012', name: '김수년', team: 'DS', level: '고급', status: 'active' },
  { id: 'u013', name: '장재은', team: 'DS', level: '고급', status: 'resigned', resignedAt: '2026-04-10' },
  { id: 'u014', name: '이민영', team: 'DS', level: '초급', status: 'active' },
  { id: 'u015', name: '오지원', team: 'DS', level: '초급', status: 'resigned', resignedAt: '2026-04-03' },
  { id: 'u016', name: '윤정환', team: 'DS', level: '초급', status: 'resigned', resignedAt: '2026-02-27' },
  { id: 'u017', name: '이단디', team: 'DS', level: '초급', status: 'active', joinedAt: '2026-05-06' },
  // DP 5명
  { id: 'u018', name: '최재원', team: 'DP', level: '고급', status: 'active', note: '9월 출산휴가 예정' },
  { id: 'u019', name: '이장욱', team: 'DP', level: '초급', status: 'active' },
  { id: 'u020', name: '임지원', team: 'DP', level: '초급', status: 'active' },
  { id: 'u021', name: '정소영', team: 'DP', level: '초급', status: 'active' },
  { id: 'u022', name: '윤이나', team: 'DP', level: '초급', status: 'active' },
  // DH 5명
  { id: 'u023', name: '강신환', team: 'DH', level: '특급', status: 'active' },
  { id: 'u024', name: '원지윤', team: 'DH', level: '특급', status: 'active' },
  { id: 'u025', name: '신민수', team: 'DH', level: '특급', status: 'active' },
  { id: 'u026', name: '강창규', team: 'DH', level: '특급', status: 'active' },
  { id: 'u027', name: '김형균', team: 'DH', level: '특급', status: 'active', joinedAt: '2026-01-05' },
  // DI 5명
  { id: 'u028', name: '김진규', team: 'DI', level: '고급', status: 'active' },
  { id: 'u029', name: '이지우', team: 'DI', level: '중급', status: 'active' },
  { id: 'u030', name: '황세호', team: 'DI', level: '초급', status: 'active' },
  { id: 'u031', name: '이재헌', team: 'DI', level: '초급', status: 'active' },
  { id: 'u032', name: '김남민', team: 'DI', level: '초급', status: 'active', joinedAt: '2026-05-11' },
  // DA 5명
  { id: 'u033', name: '김종호', team: 'DA', level: '고급', status: 'active' },
  { id: 'u034', name: '김태규', team: 'DA', level: '중급', status: 'active' },
  { id: 'u035', name: '문성경', team: 'DA', level: '초급', status: 'active' },
  { id: 'u036', name: '차유림', team: 'DA', level: '초급', status: 'active' },
  { id: 'u037', name: '모성유', team: 'DA', level: '초급', status: 'active', joinedAt: '2026-05-11' },
  // DO 5명
  { id: 'u038', name: '신태영', team: 'DO', level: '고급', status: 'active' },
  { id: 'u039', name: '양영기', team: 'DO', level: '초급', status: 'active' },
  { id: 'u040', name: '김영주', team: 'DO', level: '중급', status: 'resigned', resignedAt: '2026-04-08' },
  { id: 'u041', name: '김명빈', team: 'DO', level: '초급', status: 'active' },
  { id: 'u042', name: '김현욱', team: 'DO', level: '중급', status: 'leave', note: '~W16 휴직 후 복귀' },
  // DX 4명
  { id: 'u043', name: '강승일', team: 'DX', level: '특급', status: 'active' },
  { id: 'u044', name: '이상재', team: 'DX', level: '고급', status: 'active' },
  { id: 'u045', name: '이윤지', team: 'DX', level: '초급', status: 'active' },
  { id: 'u046', name: '김서연', team: 'DX', level: '중급', status: 'active', joinedAt: '2026-01-19' },
];

// ===== 53주 생성 (W1: 2026-01-05 월요일 기준) =====
function mondayOfW(n) {
  const d = new Date(2026, 0, 5); // 2026-01-05 (월)
  d.setDate(d.getDate() + (n - 1) * 7);
  return d;
}
function fmtMD(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const WEEKS = [];
for (let i = 1; i <= 53; i++) {
  const m = mondayOfW(i);
  const f = new Date(m); f.setDate(f.getDate() + 4);
  const month = m.getMonth() + 1;
  WEEKS.push({
    id: `W${i}`,
    num: i,
    monday: m,
    friday: f,
    label: `W${i}`,
    range: `${fmtMD(m)}–${fmtMD(f)}`,
    year: 2026,
    month,
    quarter: Math.floor((month - 1) / 3) + 1,
    half: month <= 6 ? 'H1' : 'H2',
  });
}

// 기준일: 2026-04-20 월요일 = W16
const TODAY = new Date(2026, 3, 20);
function currentWeekIdx() { return 15; /* W16 */ }

// 주차 범위 헬퍼
function wRange(from, to) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(`W${i}`);
  return arr;
}

// ===== 주별 가동률 데이터 (엑셀 원본) =====
// 각 인원별로 { weekId: { client, value, note } } — note가 있으면 휴가/교육 등
const UTIL = {};
function addUtil(userId, entries) {
  if (!UTIL[userId]) UTIL[userId] = {};
  entries.forEach(([weeks, client, value, note]) => {
    // weeks: ['W1','W2',...] 또는 {__range: [a, b]}
    let ws;
    if (weeks && weeks.__range) ws = wRange(weeks.__range[0], weeks.__range[1]);
    else if (Array.isArray(weeks)) ws = weeks;
    else ws = [];
    ws.forEach(w => {
      UTIL[userId][w] = { client: client || null, value: value ?? null, note: note || null };
    });
  });
}
// 주차 range helper — 사용: R(1,6) = W1~W6
const R = (a, b) => ({ __range: [a, b] });

// ===== DM =====
addUtil('u001', [  // 허순구
  [R(1,6), '이크레더블', 1],
  [['W8'], null, null, '구정(16~18)'],
  [R(9,11), '이크레더블', 1],
  [['W12'], null, null, '휴가'],
  [['W13'], null, null, '휴가(~3/23)'],
]);
addUtil('u002', [  // 박혜주
  [R(1,23), '새마을금고', 1],
  [['W24'], null, null, '휴가(프로젝트휴가)'],
  [['W25'], null, null, '(연차)휴가'],
  [['W26'], null, null, '휴가'],
]);
addUtil('u003', [  // 최철호
  [R(1,23), '새마을금고', 1],
  [R(24,26), null, null, '휴가'],
]);
addUtil('u004', [  // 남하영
  [R(1,23), '새마을금고', 1],
  [R(24,26), null, null, '휴가'],
]);
addUtil('u005', [  // 임성아 (퇴사)
  [R(1,3), '새마을금고', 1],
  [['W4'], null, null, '퇴사(1/29)'],
]);
addUtil('u006', [  // 최필수
  [R(1,23), '새마을금고', 1],
  [['W24'], null, null, '휴가(프로젝트휴가)'],
  [['W26'], null, null, '휴가'],
]);

// ===== DF =====
addUtil('u007', [  // 김보람
  [R(1,8), 'Agent Works', 0],
  [['W9'], '이크레더블', 0],
  [['W10'], '이크레더블', 1],
  [R(11,35), '삼성물산', 1],
]);
addUtil('u008', [  // 장민정
  [R(1,53), '신한투자증권', 1],
]);
addUtil('u009', [  // 최유정
  [R(1,5), 'HMM', 1],
  [R(6,7), null, null, '휴가'],
  [R(8,14), 'Fn', 1],
  [['W15'], 'Fn', 0.4],
  [['W16'], '한국투자저축은행/동국실업/휴가', 0],
  [R(17,35), '삼성물산', 1],
]);
addUtil('u010', [  // 박경우
  [R(1,10), 'HMM', 1],
  [['W11'], null, 0],
  [R(12,22), 'NH투자증권', 1],
  [['W23'], null, null, '휴가'],
  [['W24'], 'BNK(예정)', 1],
  [R(25,36), 'BNK', 1],
]);
addUtil('u011', [  // 정주연
  [R(1,10), 'HMM', 0],
  [['W11'], null, 0, '직무교육(3일)/휴가 2일'],
  [['W12'], null, 0, '월드비전 제안준비'],
  [['W13'], null, 0, 'Snowflake 학습'],
  [['W14'], null, 0, 'Snowflake 시험(4/4)'],
  [['W15'], null, 0, 'SnP Core 자격취득'],
  [['W16'], null, 0, 'Agentworks 테스트'],
  [['W17'], null, 0, 'Agentworks/tableau next'],
  [['W18'], '삼성물산', 0.4],
  [R(19,35), '삼성물산', 1],
]);

// ===== DS =====
addUtil('u012', [  // 김수년
  [['W1'], '교육지원', 0.4],
  [R(2,3), '가천대', 0.2],
  [['W4'], 'SK머티리얼즈', 0.4],
  [R(5,19), 'AXA', 1],
  [R(20,21), 'AXA 지원', 1],
]);
addUtil('u013', [  // 장재은 (퇴사)
  [R(1,14), 'SK렌터카', 1],
  [['W15'], 'SK렌터카(4/3철수)', 1],
]);
addUtil('u014', [  // 이민영
  [R(1,4), 'HMM', 0],
  [R(5,18), 'AXA', 1],
  [['W19'], 'AXA 지원', 1],
  [['W20'], null, null, '휴가'],
  [['W21'], '현대해상', 1],
]);
addUtil('u015', [  // 오지원 (퇴사)
  [R(1,4), 'HMM', 0],
  [R(5,13), 'AXA', 1],
  [['W14'], 'AXA', 0.4],
]);
addUtil('u016', [  // 윤정환 (퇴사)
  [R(1,7), '노루페인트', 1],
  [['W8'], null, null, '퇴사'],
]);
addUtil('u017', [  // 이단디 (5/6 입사)
  [['W19'], '리만코리아', 0.6, '5/6 입사'],
  [R(20,28), '리만코리아', 1],
  [R(30,33), '리만코리아', 1],
]);

// ===== DP =====
addUtil('u018', [  // 최재원
  [R(1,4), 'HMM', 1],
  [R(5,18), '노루페인트', 1],
  [['W19'], '노루페인트(연장가능성)', 1],
  [['W24'], null, null, '휴가'],
  [R(36,40), null, null, '9월 출산휴가'],
]);
addUtil('u019', [  // 이장욱
  [R(1,53), '메리츠화재', 1],
]);
addUtil('u020', [  // 임지원
  [R(1,53), '메리츠화재', 1],
]);
addUtil('u021', [  // 정소영
  [R(1,14), '새마을금고', 1],
  [['W15'], null, 0, '휴가'],
  [['W16'], 'AXA손보', 0],
  [['W17'], 'AXA', 0],
  [['W18'], 'AXA 지원', 0],
  [['W19'], null, 0, '컨퍼런스'],
  [['W20'], null, null, '휴가'],
  [R(21,24), '동양생명', 1],
  [['W25'], '동양생명', 0.4],
]);
addUtil('u022', [  // 윤이나
  [R(1,3), '이크레더블', 0],
  [R(4,11), '새마을금고', 1],
  [R(12,18), '노루페인트', 1],
  [R(20,26), '나이스정보통신', 1],
]);

// ===== DH =====
addUtil('u023', [  // 강신환
  [R(1,11), 'HMM', 1],
  [['W12'], null, 0, '휴가'],
  [['W13'], 'Agent Works', 0],
  [['W14'], null, 0, 'Agentworks 테스트'],
  [['W15'], 'LS+현대해상', 0.4],
  [R(16,17), '현대해상', 0],
  [['W18'], '동국실업 PoC', 0],
  [['W19'], '현대해상+AXA', 0],
  [R(20,21), 'AXA 지원', 0],
  [['W22'], 'AXA 지원', 1],
  [R(23,27), '동양생명', 1],
  [['W28'], '동양생명', 0.4],
]);
addUtil('u024', [  // 원지윤
  [R(1,10), 'SK ON', 1],
  [['W11'], null, 0, '휴가'],
  [R(12,13), '하나증권 제안', 0],
  [['W14'], '삼성자산운용/한국투자저축은행 PoC', 0],
  [R(15,25), 'SK렌터카', 1],
  [R(41,53), 'SK ON', 1],
]);
addUtil('u025', [  // 신민수
  [R(1,5), '이크레더블', 1],
  [R(6,14), '이크레더블', 0],
  [['W15'], 'KB손해보험', 0.6],
  [R(16,22), 'KB손해보험', 1],
  [R(23,25), null, null, '휴가'],
]);
addUtil('u026', [  // 강창규
  [R(1,10), '이크레더블', 0],
  [R(11,45), '코오롱', 1],
]);
addUtil('u027', [  // 김형균 (1/5 입사)
  [['W1'], null, 0, '입사'],
  [R(2,3), 'Agent Works', 0],
  [['W4'], '노루페인트', 0],
  [R(5,6), 'Fn/SKT', 1],
  [R(7,11), 'Fn/A-W', 0.5],
  [['W14'], null, 0, 'Agentworks 테스트'],
  [['W15'], '현대카드+아스트라제네카', 0.5],
  [['W16'], null, 0, 'Agentworks 테스트'],
  [['W17'], '현대카드 제안', 0],
  [['W18'], '현대카드', 0],
]);

// ===== DI =====
addUtil('u028', [  // 김진규
  [R(1,7), 'HMM', 1],
  [['W10'], null, 0, '휴가'],
  [['W11'], null, 0],
  [['W12'], '월드비전 제안/휴가', 0],
  [['W13'], '휴가/월드비전 제안', 0],
  [['W14'], '월드비전 제안', 0],
  [['W15'], '삼성로지텍', 0.6],
  [R(16,19), '삼성로지텍', 1],
]);
addUtil('u029', [  // 이지우
  [R(1,19), '새마을금고', 1],
  [['W22'], null, null, '휴가'],
  [['W23'], null, null, '휴가(6/8)'],
  [R(27,53), '신한투자증권', 1],
]);
addUtil('u030', [  // 황세호
  [R(1,53), '미래에셋증권', 1],
]);
addUtil('u031', [  // 이재헌
  [R(1,4), '노루페인트', 1],
  [R(6,14), '코오롱', 1],
  [R(15,16), '코오롱 인수인계', 0],
  [R(17,27), 'KB손해보험', 1],
]);
addUtil('u032', [  // 김남민 (5/11 입사)
  [['W20'], '동양생명', 1, '5/11 입사'],
  [R(21,27), '동양생명', 1],
  [['W28'], '동양생명', 0.4],
]);

// ===== DA =====
addUtil('u033', [  // 김종호
  [R(1,10), '이크레더블', 1],
  [['W11'], null, 0, '휴가'],
  [['W12'], null, 0, '휴가(~3/25)'],
  [['W13'], '현대카드+아스트라제네카', 0.5],
  [['W14'], '서브원', 0.2],
  [R(15,28), '서브원', 1],
]);
addUtil('u034', [  // 김태규
  [R(1,12), 'LS증권', 1],
  [R(13,51), '코오롱', 1],
]);
addUtil('u035', [  // 문성경
  [R(1,18), '노루페인트', 1],
  [['W19'], '노루페인트(연장가능성)', 1],
]);
addUtil('u036', [  // 차유림
  [['W1'], '새마을금고', 0],
  [['W2'], '가천대', 1],
  [R(3,21), 'SK ON', 1],
]);
addUtil('u037', [  // 모성유 (5/11 입사)
  [['W20'], '나이스정보통신', 1, '5/11 입사'],
  [R(21,27), '나이스정보통신', 1],
]);

// ===== DO =====
addUtil('u038', [  // 신태영
  [R(1,53), 'SK디스커버리', 1],
]);
addUtil('u039', [  // 양영기
  [R(1,53), 'SKC', 1],
]);
addUtil('u040', [  // 김영주 (퇴사)
  [R(1,14), 'SK ON', 1],
  [['W15'], 'SK ON', 0.4],
  [['W16'], null, null, '퇴사(4/8)'],
]);
addUtil('u041', [  // 김명빈
  [R(1,53), 'LG화학', 1],
]);
addUtil('u042', [  // 김현욱 (휴직 → 복귀)
  [R(1,16), null, null, '휴직'],
  [R(17,53), '하나증권', 1],
]);

// ===== DX =====
addUtil('u043', []); // 강승일 - 기록 없음
addUtil('u044', [  // 이상재
  [R(1,12), '삼성전자', 0.5],
  [R(13,14), '삼성전자/GS엠비즈', 1],
  [R(15,53), '삼성전자', 0.5],
]);
addUtil('u045', [  // 이윤지
  [['W1'], '월드비전/교육지원', 0.65],
  [['W2'], '월드비전', 0.2],
  [R(3,7), '월드비전/가천대', 1],
  [R(8,9), '월드비전', 0.2],
  [R(10,47), '월드비전/던롭', 0.5],
  [R(48,53), '월드비전', 0.2],
]);
addUtil('u046', [  // 김서연 (1/19 입사)
  [R(3,4), null, 0, '온보딩'],
]);

// ===== 영업 파이프라인 =====
const PIPELINE_STAGES = [
  { id: '완료', color: '#64748B' },
  { id: '확정', color: '#10B981' },
  { id: '예정', color: '#60A5FA' },
];
const PROJECT_KINDS = ['SM', 'PoC', 'PJ', 'PJ(M)', 'PS', '운영'];

const PIPELINE = [
  { priority: 99, client: 'SKC',                kind: 'SM',    status: '완료', sales: '윤종식',          preSales: null,      start: '2026-03-04', end: '2026-03-31', mm: 1,    members: '',                                 note: '2/23 js 3/4부터 투입. 계약 완료' },
  { priority: 99, client: '미래에셋자산운용',   kind: 'PoC',   status: '확정', sales: '박치언',          preSales: null,      start: '2026-03-14', end: '2026-03-29', mm: null, members: '김태규, 최진아(박혜주)',            note: '3/26 CE 추가요건으로 기간 연장' },
  { priority: 99, client: '다올저축은행',       kind: 'PoC',   status: '확정', sales: '김지원',          preSales: null,      start: '2026-03-15', end: '2026-03-29', mm: 0.5,  members: '이세영, 정소영(김보람)',            note: '3/28 JH 추가 요청 사항으로 2~3일 추가계약' },
  { priority: 99, client: '메리츠화재',         kind: 'SM',    status: '확정', sales: '박기열',          preSales: null,      start: '2026-03-18', end: '2026-07-31', mm: 16,   members: '김용진, 천우범, 이민영, 임지원',    note: '3/25 SM 5차 연장 계약서 날인본 전달' },
  { priority: 99, client: 'UBASE',              kind: 'PJ',    status: '확정', sales: '박기열',          preSales: null,      start: '2026-03-20', end: '2026-05-07', mm: null, members: '김진규, 박경우',                    note: '3/14 JH 월~수 시작 가능성 높음' },
  { priority: 99, client: '포스코 광양',        kind: 'PoC',   status: '확정', sales: '윤종식',          preSales: null,      start: '2026-03-20', end: '2026-03-27', mm: 0.15, members: '신민수, 최필수',                    note: '3/28 JH 타부서 요청으로 하루 연장' },
  { priority: 99, client: 'LG엔솔',             kind: 'PJ',    status: '완료', sales: '박기열',          preSales: null,      start: '2026-03-25', end: '2026-06-24', mm: null, members: '김진규, 최유정, 최필수',            note: '3/4 gy 25일 시작 확정' },
  { priority: 99, client: '삼성물산 패션부문',  kind: 'PJ',    status: '확정', sales: '윤종식',          preSales: null,      start: '2026-04-01', end: '2026-09-30', mm: null, members: '김보람, 이세영, 정소영',            note: '3/26 js 내부 보고 진행 중' },
  { priority: 99, client: '풀무원(음성공장)',   kind: 'PJ',    status: '확정', sales: '박치언',          preSales: null,      start: '2026-04-04', end: '2026-06-03', mm: 4,    members: '오로라, 곽다인',                    note: '4/3 CE 전사 투자 막혀 무기한 홀딩' },
  { priority: 99, client: '씨젠의료재단',       kind: 'PJ',    status: '확정', sales: '박기열',          preSales: null,      start: '2026-04-08', end: '2026-09-07', mm: 20,   members: '박혜주, 김태규, 최유정, 최진아',    note: '4/2 JH 내부 품의 완료. 4/4 투입 미팅' },
  { priority: 99, client: 'JB금융지주',         kind: 'PS',    status: '확정', sales: '박치언',          preSales: null,      start: '2026-04-12', end: '2026-04-25', mm: 0.5,  members: '이지우',                            note: '4/11 CE 4/12 착수' },
  { priority: 99, client: 'CJ대한통운 건설부문', kind: 'PJ',   status: '확정', sales: '박치언',          preSales: null,      start: '2026-04-22', end: '2026-05-08', mm: 0.5,  members: '최철호',                            note: '4/19 CE 4/22 비상주 확정' },
  { priority: 99, client: '엔미디어플랫폼',     kind: 'PJ',    status: '확정', sales: '김지원',          preSales: null,      start: '2026-04-22', end: null,         mm: 2.5,  members: '장채령, 윤한별(.5)',                note: '4/2 JW 초급 2MM + 디자인 0.5MM 협의' },
  { priority: 99, client: '우리금융지주',       kind: 'PJ',    status: '예정', sales: '박치언',          preSales: '김대중',  start: '2026-05-01', end: '2026-10-30', mm: 19,   members: '3명 × 6개월',                       note: '4/26 dj Closed lost (태블로 전환 실패)' },
  { priority: 99, client: '신영증권',           kind: 'PoC',   status: '확정', sales: '박치언',          preSales: null,      start: '2026-05-03', end: '2026-05-10', mm: 0.25, members: '최필수',                            note: '4/30 CE 방문 PoC 일정협의 완료' },
  { priority: 1,  client: '로티',               kind: 'PJ',    status: '예정', sales: '김지원',          preSales: '이준호',  start: '2026-05-13', end: '2026-07-12', mm: 2,    members: '오로라(1.5MM), 곽다인(0.5MM)',      note: '5/14 JH 로티 내부 사정으로 지연' },
  { priority: 99, client: 'SK온',               kind: 'PJ',    status: '확정', sales: '윤종식',          preSales: null,      start: '2026-05-16', end: '2026-08-30', mm: 3.5,  members: '원지윤, 최철호+윤한별',             note: '4/23 js 최철호 매니저 투입 가능' },
  { priority: 1,  client: 'CJ대한통운 인사운영', kind: 'PJ',   status: '예정', sales: '박치언',          preSales: null,      start: '2026-05-27', end: '2026-06-07', mm: 0.5,  members: '이지우(후보)',                      note: '5/9 CE 5/27 착수 협의 완료' },
  { priority: 1,  client: 'LG에너지솔루션',     kind: 'PJ',    status: '확정', sales: '이정철',          preSales: '박기열',  start: '2026-06-01', end: '2026-08-31', mm: 5.5,  members: '신민수, 이지우',                    note: '5/2 GY 6/1 착수 팔로업 중' },
  { priority: 1,  client: 'SK하이닉스',         kind: 'PJ',    status: '확정', sales: '윤종식',          preSales: null,      start: '2026-06-01', end: '2026-12-31', mm: 19,   members: '이찬희, 김수년, 장채령',            note: '5/8 SM 프로필 전달' },
  { priority: 1,  client: '미래에셋자산운용',   kind: 'PJ',    status: '예정', sales: '박치언',          preSales: '이준호',  start: '2026-06-03', end: '2026-08-30', mm: 3,    members: 'TBD 1명',                           note: '5/14 6월 1주차 시작 논의 중' },
  { priority: 1,  client: 'KT DS',              kind: 'SM',    status: '예정', sales: '이정철',          preSales: '박기열',  start: '2026-06-03', end: '2026-09-30', mm: 4,    members: '허민',                              note: '5/7 JH 6/3 시작 예정' },
  { priority: 55, client: '아우디 (EY)',        kind: 'PJ(M)', status: '예정', sales: '윤종식',          preSales: null,      start: '2026-06-03', end: '2026-12-31', mm: 6,    members: '원지윤, 이수민',                    note: '4/17 js 결과 발표 대기' },
  { priority: 55, client: '아시아나항공',       kind: 'PJ',    status: '확정', sales: '이정철',          preSales: '박기열',  start: '2026-06-03', end: '2026-12-31', mm: 53,   members: '허순구, 김진규, 김옥래 외 7명',     note: '5/2 GY 최유정→김미순 변경' },
  { priority: 55, client: 'SK매직',             kind: '운영',  status: '확정', sales: '윤종식',          preSales: null,      start: '2026-06-10', end: '2026-12-31', mm: 6,    members: '이동인(BICNS)',                     note: '5/7 JH BICNS 인력으로 대체' },
  { priority: 1,  client: '포스코 메타버스',    kind: 'PJ',    status: '예정', sales: '윤종식',          preSales: '이준호',  start: '2026-06-15', end: '2026-12-31', mm: 12,   members: 'TBD 1명, 최필수',                   note: '5/2 js 6월 중순~7월 초 투입' },
  { priority: 55, client: '다우기술(키움증권)', kind: 'PoC',   status: '예정', sales: '박치언',          preSales: null,      start: '2026-06-24', end: null,         mm: null, members: '',                                  note: '6월말 PoC 진행 가능성' },
  { priority: 1,  client: '신한투자증권',       kind: 'PJ',    status: '확정', sales: '박치언',          preSales: '이준호',  start: '2026-07-01', end: '2027-02-28', mm: 10,   members: '서동현, TBD, 최유정, 윤한별',       note: '4/25 CE 투입 일정 협의 완료' },
  { priority: 55, client: '전남대',             kind: 'PJ',    status: '예정', sales: '정순보',          preSales: null,      start: '2026-07-01', end: '2026-09-30', mm: 4,    members: '2명 × 2개월',                       note: '4/24 sb 대시보드 개발' },
  { priority: 55, client: '대성에너지',         kind: 'PJ',    status: '예정', sales: '박기열',          preSales: '이준호',  start: '2026-07-01', end: null,         mm: null, members: '',                                  note: '3/28 JH 5월부터 정식 라이선스' },
  { priority: 1,  client: '파라다이스',         kind: 'PJ',    status: '예정', sales: '윤종식',          preSales: '김대중',  start: '2026-07-15', end: '2026-11-15', mm: 15,   members: 'TBD 3명',                           note: '5/7 JH 7/15 시작 예상' },
  { priority: 1,  client: '현대해상화재',       kind: 'PJ',    status: '예정', sales: '박치언',          preSales: '김대중',  start: '2026-08-01', end: '2026-10-31', mm: 12,   members: '김용진, 천우범, 박경우, TBD',       note: '5/7 CE 4명×3달 변경 확정' },
  { priority: 1,  client: '포스코 광양',        kind: 'PJ',    status: '예정', sales: '윤종식',          preSales: '이준호',  start: '2026-08-01', end: '2026-10-31', mm: 9,    members: '2~3명 × 3개월',                     note: '4/22 js 재무팀 미팅' },
  { priority: 55, client: 'MBC',                kind: 'PJ(M)', status: '예정', sales: '김지원',          preSales: '이준호',  start: '2026-08-01', end: '2026-11-30', mm: 4,    members: 'TBD 1명',                           note: '3/28 JY 4월 총선 지연, 5월초 착수' },
  { priority: 1,  client: '다올저축은행',       kind: 'PJ',    status: '예정', sales: '김지원',          preSales: '이준호',  start: '2026-08-05', end: '2026-11-29', mm: null, members: '최소 2명',                          note: '4/24 JW 7월초 시작 목표, 예산 2억' },
  { priority: 55, client: '새마을금고',         kind: 'PJ',    status: '예정', sales: '박치언',          preSales: null,      start: '2026-09-01', end: null,         mm: 80,   members: '김용진, 천우범, 임지원',            note: '3/14 일정 밀릴 가능성' },
  { priority: 55, client: 'SKC',                kind: 'PJ',    status: '예정', sales: '윤종식',          preSales: '이준호',  start: '2026-06-03', end: '2026-10-04', mm: 15,   members: '최재원, TBD 3명',                   note: '5/14 JH 수행 결정 확률 50%' },
].map((p, i) => ({ id: `prj${String(i+1).padStart(3,'0')}`, ...p }));

// ===== 가동률 조회 =====
function computeUtilization(userId, weekId) {
  const u = UTIL[userId] || {};
  const cell = u[weekId];
  if (!cell) return { value: 0, client: null, note: null, empty: true };
  return {
    value: cell.value == null ? 0 : cell.value,
    client: cell.client,
    note: cell.note,
    hasValue: cell.value != null,
  };
}

// KPI 목표
const KPI_TARGET = 0.85; // 85%

// 영업 담당자 목록 (파이프라인에서 유니크 추출)
const SALES_PEOPLE = [...new Set(PIPELINE.map(p => p.sales).filter(Boolean))];

// 등급별 색상
const LEVEL_COLORS = { '본부장': '#1E293B', '특급': '#8B5CF6', '고급': '#3B82F6', '중급': '#10B981', '초급': '#F59E0B' };

// Window expose
window.APP_DATA = {
  TEAMS, USERS, WEEKS, UTIL, PIPELINE, PIPELINE_STAGES, PROJECT_KINDS,
  LEVELS, LEVEL_COLORS, STATUSES, SALES_PEOPLE, KPI_TARGET,
  TODAY,
  computeUtilization,
  currentWeekIdx,
  fmtMD, fmtYMD,
};
