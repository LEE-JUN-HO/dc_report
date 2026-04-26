// ============================================================
// Supabase 연동 어댑터
//
// 우선순위:
//   1) localStorage (설정 화면에서 입력한 값) — 개발자/관리자용
//   2) window.SUPABASE_URL / SUPABASE_ANON_KEY — index.html 하드코딩
//      → 팀원 전체가 공유하는 공용 연결
//
// 연결 실패 시 로컬 더미 데이터로 fallback.
// ============================================================

(async function() {
  const URL_FROM_LS = localStorage.getItem('SUPABASE_URL');
  const KEY_FROM_LS = localStorage.getItem('SUPABASE_ANON_KEY');

  // 하드코딩 플레이스홀더는 무시 (실제 값으로 교체 안 됐으면 localStorage나 데모로 fallback)
  const isPlaceholder = (v) => !v || v.includes('여기에') || v === '';
  const URL = URL_FROM_LS || (isPlaceholder(window.SUPABASE_URL) ? null : window.SUPABASE_URL);
  const KEY = KEY_FROM_LS || (isPlaceholder(window.SUPABASE_ANON_KEY) ? null : window.SUPABASE_ANON_KEY);

  if (!URL || !KEY || !window.supabase) {
    console.info('[Resource Hub] Supabase 미연결 — 로컬 데모 데이터 사용');
    return;
  }

  const client = window.supabase.createClient(URL, KEY);
  console.info('[Resource Hub] Supabase 연결 시도 →', URL);

  try {
    // 1. 팀/인원/가동률/파이프라인 병렬 로드
    const [tRes, uRes, utRes, pRes] = await Promise.all([
      client.from('teams').select('*').order('sort_order'),
      client.from('users').select('*').order('id'),
      client.from('utilization').select('*'),
      client.from('pipeline').select('*').order('priority').order('start_date'),
    ]);

    if (tRes.error || uRes.error || utRes.error || pRes.error) {
      throw new Error('쿼리 실패: ' + JSON.stringify([tRes, uRes, utRes, pRes].map(r => r.error?.message).filter(Boolean)));
    }

    // 2. 기존 APP_DATA를 DB 데이터로 교체
    const TEAMS = tRes.data.map(t => ({ id: t.id, name: t.name, color: t.color }));
    const USERS = uRes.data.map(u => ({
      id: u.id, name: u.name, team: u.team_id, level: u.level,
      status: u.status, isManager: u.is_manager,
      joinedAt: u.joined_at, resignedAt: u.resigned_at, note: u.note,
    }));
    const UTIL = {};
    utRes.data.forEach(row => {
      if (!UTIL[row.user_id]) UTIL[row.user_id] = {};
      UTIL[row.user_id][row.week_id] = { client: row.client, value: row.value, note: row.note };
    });
    const PIPELINE = pRes.data.map(p => ({
      id: p.id, priority: p.priority, client: p.client, kind: p.kind, status: p.status,
      sales: p.sales, preSales: p.pre_sales,
      start: p.start_date, end: p.end_date,
      mm: p.mm != null ? +p.mm : null,
      members: p.members, note: p.note,
      slackChannelId: p.slack_channel_id || null,
    }));

    Object.assign(window.APP_DATA, { TEAMS, USERS, UTIL, PIPELINE });
    window.APP_DATA.SALES_PEOPLE = [...new Set(PIPELINE.map(p => p.sales).filter(Boolean))];
    window.__SUPABASE_CLIENT__ = client;
    window.__SUPABASE_CONNECTED__ = true;

    // React에 데이터 교체 알림 — PipelineView 등이 재렌더링되도록
    window.dispatchEvent(new CustomEvent('data-changed'));

    // 3. 저장 훅 오버라이드 (UTIL 수정 시 DB upsert)
    const origCompute = window.APP_DATA.computeUtilization;
    window.APP_DATA.computeUtilization = origCompute; // 동일 — 메모리 데이터 참조

    function throwIfError(res, label) {
      if (res.error) {
        const msg = `[Supabase] ${label} 실패: ${res.error.message || JSON.stringify(res.error)}`;
        console.error(msg, res.error);
        throw new Error(res.error.message || label + ' 실패');
      }
    }

    window.APP_DATA.saveUtilization = async (userId, weekId, value, clientName, note) => {
      if (value == null && !clientName && !note) {
        throwIfError(
          await client.from('utilization').delete().match({ user_id: userId, week_id: weekId }),
          'utilization 삭제'
        );
      } else {
        throwIfError(
          await client.from('utilization').upsert({
            user_id: userId, week_id: weekId,
            value, client: clientName, note,
            updated_at: new Date().toISOString(),
          }),
          'utilization 저장'
        );
      }
    };
    window.APP_DATA.savePipeline = async (p) => {
      throwIfError(
        await client.from('pipeline').upsert({
          id: p.id, priority: p.priority || 99, client: p.client, kind: p.kind || 'PJ', status: p.status,
          sales: p.sales, pre_sales: p.preSales,
          start_date: p.start || null, end_date: p.end || null, mm: p.mm,
          members: p.members, note: p.note,
          slack_channel_id: p.slackChannelId || null,
        }),
        'pipeline 저장'
      );
    };
    window.APP_DATA.deletePipeline = async (id) => {
      throwIfError(
        await client.from('pipeline').delete().eq('id', id),
        'pipeline 삭제'
      );
    };

    // ===== 팀 CRUD =====
    window.APP_DATA.saveTeam = async (t) => {
      throwIfError(
        await client.from('teams').upsert({
          id: t.id, name: t.name, color: t.color,
          sort_order: t.sortOrder ?? 99,
        }),
        'team 저장'
      );
    };
    window.APP_DATA.deleteTeam = async (id) => {
      throwIfError(
        await client.from('teams').delete().eq('id', id),
        'team 삭제'
      );
    };

    // ===== 인원 CRUD =====
    window.APP_DATA.saveUser = async (u) => {
      throwIfError(
        await client.from('users').upsert({
          id: u.id, name: u.name, team_id: u.team, level: u.level,
          status: u.status, is_manager: u.isManager || false,
          joined_at: u.joinedAt || null,
          resigned_at: u.resignedAt || null,
          note: u.note || null,
        }),
        'user 저장'
      );
    };
    window.APP_DATA.deleteUser = async (id) => {
      // utilization은 ON DELETE CASCADE로 자동 정리됨
      throwIfError(
        await client.from('users').delete().eq('id', id),
        'user 삭제'
      );
    };

    // 4. Realtime 구독 — 다른 사용자 변경 자동 반영
    client
      .channel('util-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utilization' }, payload => {
        console.info('[Realtime] util changed', payload);
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline' }, payload => {
        console.info('[Realtime] pipeline changed', payload);
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .subscribe();

    // 5. 연결 성공 배지
    const badge = document.createElement('div');
    badge.textContent = '☁ Supabase 연결됨';
    badge.style.cssText = 'position:fixed;bottom:12px;left:12px;background:#10B981;color:white;padding:4px 10px;border-radius:4px;font-size:11px;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 3000);

    console.info(`[Resource Hub] ✓ 연결 성공: ${TEAMS.length}팀, ${USERS.length}명, ${PIPELINE.length}건, ${utRes.data.length}개 가동률 레코드`);
  } catch (err) {
    console.error('[Resource Hub] Supabase 연결 실패:', err);
    const badge = document.createElement('div');
    badge.innerHTML = `⚠ Supabase 연결 실패<br><span style="font-size:10px">${err.message}</span>`;
    badge.style.cssText = 'position:fixed;bottom:12px;left:12px;background:#DC2626;color:white;padding:6px 10px;border-radius:4px;font-size:11px;z-index:99;max-width:280px;';
    document.body.appendChild(badge);
  }
})();
