// ============================================================
// Supabase 연동 어댑터
//
// 운영 데이터는 반드시 Supabase DB만 사용합니다.
// 브라우저 localStorage는 가동률 저장소나 Supabase 자격증명 소스로 쓰지 않습니다.
// ============================================================

(async function() {
  const isPlaceholder = (v) => !v || v.includes('여기에') || v === '';
  const URL = isPlaceholder(window.SUPABASE_URL) ? null : window.SUPABASE_URL;
  const KEY = isPlaceholder(window.SUPABASE_ANON_KEY) ? null : window.SUPABASE_ANON_KEY;
  let saveUtilizationImpl = null;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  window.__RESOURCE_HUB_DATA_READY__ = ready;
  window.APP_DATA.saveUtilization = async (...args) => {
    await ready;
    if (!saveUtilizationImpl) throw new Error('저장 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return saveUtilizationImpl(...args);
  };

  if (!URL || !KEY || !window.supabase) {
    console.error('[Resource Hub] Supabase 설정 없음 — DB 저장 비활성화');
    resolveReady();
    return;
  }

  // ── Supabase 연결 시도 ─────────────────────────────────────────────────
  const client = window.supabase.createClient(URL, KEY);
  console.info('[Resource Hub] Supabase 연결 시도 →', URL);

  try {
    async function fetchAllRows(table, queryBuilder, chunkSize = 1000) {
      const rows = [];
      for (let from = 0; ; from += chunkSize) {
        const to = from + chunkSize - 1;
        const res = await queryBuilder(client.from(table).select('*')).range(from, to);
        if (res.error) return res;
        rows.push(...(res.data || []));
        if (!res.data || res.data.length < chunkSize) {
          return { data: rows, error: null };
        }
      }
    }

    const [tRes, uRes, utRes, pRes] = await Promise.all([
      client.from('teams').select('*').order('sort_order'),
      client.from('users').select('*').order('id'),
      fetchAllRows('utilization', q => q.order('user_id').order('week_id')),
      client.from('pipeline').select('*').order('priority').order('start_date'),
    ]);

    if (tRes.error || uRes.error || utRes.error || pRes.error) {
      throw new Error('쿼리 실패: ' + JSON.stringify([tRes, uRes, utRes, pRes].map(r => r.error?.message).filter(Boolean)));
    }

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

    window.dispatchEvent(new CustomEvent('data-changed'));

    function throwIfError(res, label) {
      if (res.error) {
        const msg = `[Supabase] ${label} 실패: ${res.error.message || JSON.stringify(res.error)}`;
        console.error(msg, res.error);
        throw new Error(res.error.message || label + ' 실패');
      }
    }

    saveUtilizationImpl = async (userId, weekId, value, clientName, note) => {
      const selectColumns = 'user_id,week_id,client,value,note,updated_at';
      if (value == null && !clientName && !note) {
        throwIfError(
          await client.from('utilization').delete().match({ user_id: userId, week_id: weekId }),
          'utilization 삭제'
        );
        const verifyDelete = await client
          .from('utilization')
          .select('user_id,week_id')
          .match({ user_id: userId, week_id: weekId })
          .maybeSingle();
        throwIfError(verifyDelete, 'utilization 삭제 확인');
        if (verifyDelete.data) throw new Error('삭제 확인 실패: 데이터가 아직 Supabase에 남아 있습니다.');
        console.info('[Resource Hub] utilization 삭제 완료', `${userId}/${weekId}`);
        return null;
      } else {
        const payload = {
          user_id: userId,
          week_id: weekId,
          value: value == null ? null : Number(value),
          client: clientName || null,
          note: note || null,
          updated_at: new Date().toISOString(),
        };
        throwIfError(
          await client
            .from('utilization')
            .upsert(payload, { onConflict: 'user_id,week_id' })
            .select(selectColumns)
            .single(),
          'utilization 저장'
        );
        const verifySave = await client
          .from('utilization')
          .select(selectColumns)
          .match({ user_id: userId, week_id: weekId })
          .maybeSingle();
        throwIfError(verifySave, 'utilization 저장 확인');
        if (!verifySave.data) throw new Error('저장 확인 실패: Supabase에서 저장된 행을 다시 찾지 못했습니다.');
        const savedValue = verifySave.data.value == null ? null : Number(verifySave.data.value);
        if (savedValue !== payload.value || (verifySave.data.client || null) !== payload.client || (verifySave.data.note || null) !== payload.note) {
          throw new Error('저장 확인 실패: Supabase에 저장된 값이 입력값과 다릅니다.');
        }
        console.info('[Resource Hub] utilization 저장 완료', `${userId}/${weekId}`, verifySave.data);
        return verifySave.data;
      }
    };
    resolveReady();
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
      throwIfError(
        await client.from('users').delete().eq('id', id),
        'user 삭제'
      );
    };

    client
      .channel('util-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utilization' }, () => {
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline' }, () => {
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .subscribe();

    const badge = document.createElement('div');
    badge.textContent = '☁ Supabase 연결됨';
    badge.style.cssText = 'position:fixed;bottom:12px;left:12px;background:#10B981;color:white;padding:4px 10px;border-radius:4px;font-size:11px;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 3000);

    console.info(`[Resource Hub] ✓ 연결 성공: ${TEAMS.length}팀, ${USERS.length}명, ${PIPELINE.length}건, ${utRes.data.length}개 가동률 레코드`);

  } catch (err) {
    console.error('[Resource Hub] Supabase 연결 실패 — DB 저장 비활성화:', err);
    resolveReady();

    const badge = document.createElement('div');
    badge.innerHTML = `⚠ Supabase 연결 실패 (저장 비활성)<br><span style="font-size:10px">${err.message}</span>`;
    badge.style.cssText = 'position:fixed;bottom:12px;left:12px;background:#DC2626;color:white;padding:6px 10px;border-radius:4px;font-size:11px;z-index:99;max-width:280px;';
    document.body.appendChild(badge);
  }
})();
