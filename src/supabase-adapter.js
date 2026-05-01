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
  window.__SUPABASE_AUTH_CLIENT__ = client;
  console.info('[Resource Hub] Supabase 연결 시도 →', URL);

  try {
    // ── 인증 확인 ──────────────────────────────────────────────────────
    // profiles 테이블이 없으면 (42P01) 인증 없이 통과 (하위 호환)
    const profilesCheck = await client.from('profiles').select('id').limit(1);
    const noProfilesTable = profilesCheck.error?.code === '42P01';

    if (!noProfilesTable) {
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        // 로그인 안 된 상태
        window.__RESOURCE_HUB_AUTH__ = { status: 'unauthenticated', user: null, profile: null };
        window.dispatchEvent(new CustomEvent('auth-state-changed'));
        resolveReady();
        return;
      }
      // 세션 있음 → 프로필 조회
      const { data: profile, error: profErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profErr && profErr.code !== '42P01') {
        console.warn('[Resource Hub] profiles 조회 실패:', profErr.message);
      }
      const status = profile?.status || 'pending';
      if (status !== 'approved' && status !== 'admin') {
        // pending / rejected → 앱 진입 불가
        window.__RESOURCE_HUB_AUTH__ = { status, user: session.user, profile };
        window.dispatchEvent(new CustomEvent('auth-state-changed'));
        resolveReady();
        return;
      }
      window.__RESOURCE_HUB_AUTH__ = { status, user: session.user, profile };
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
    } else {
      // profiles 테이블 없음 → 인증 우회 (하위 호환)
      window.__RESOURCE_HUB_AUTH__ = { status: 'bypass', user: null, profile: null };
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
    }
  // ── 데이터 로드 (인증 통과 or 테이블 없음) ─────────────────────────
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

    const [tRes, uRes, utRes, pRes, opRes, orRes] = await Promise.all([
      client.from('teams').select('*').order('sort_order'),
      client.from('users').select('*').order('id'),
      fetchAllRows('utilization', q => q.order('user_id').order('week_id')),
      client.from('pipeline').select('*').order('priority').order('start_date'),
      client.from('outsourcing_partners').select('*').order('sort_order').order('id'),
      fetchAllRows('outsourcing_records', q => q.order('partner_id').order('month_id')),
    ]);

    if (tRes.error || uRes.error || utRes.error || pRes.error) {
      throw new Error('쿼리 실패: ' + JSON.stringify([tRes, uRes, utRes, pRes].map(r => r.error?.message).filter(Boolean)));
    }
    // outsourcing 테이블은 아직 생성 전일 수 있으므로 오류를 무시
    if (opRes.error) console.warn('[Resource Hub] outsourcing_partners 로드 실패 (마이그레이션 필요):', opRes.error.message);
    if (orRes.error) console.warn('[Resource Hub] outsourcing_records 로드 실패 (마이그레이션 필요):', orRes.error.message);

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
      winProbability: p.win_probability != null ? +p.win_probability : null,
      members: p.members, note: p.note,
      slackChannelId: p.slack_channel_id || null,
    }));

    // 외주 인력 데이터
    const OUTSOURCING_PARTNERS = opRes.error ? [] : (opRes.data || []).map(p => ({
      id: p.id, type: p.type, company: p.company, name: p.name,
      grade: p.grade, status: p.status, contractType: p.contract_type,
      startDate: p.start_date, endDate: p.end_date, email: p.email,
      note: p.note, sortOrder: p.sort_order,
    }));
    const OUTSOURCING_RECORDS = {};
    if (!orRes.error) {
      (orRes.data || []).forEach(row => {
        if (!OUTSOURCING_RECORDS[row.partner_id]) OUTSOURCING_RECORDS[row.partner_id] = {};
        OUTSOURCING_RECORDS[row.partner_id][row.month_id] = {
          billingStatus: row.billing_status,
          revenue: row.revenue,
          cost:    row.cost,
          project: row.project,
          note:    row.note,
        };
      });
    }

    Object.assign(window.APP_DATA, { TEAMS, USERS, UTIL, PIPELINE, OUTSOURCING_PARTNERS, OUTSOURCING_RECORDS });
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
          win_probability: p.winProbability == null ? null : Math.max(0, Math.min(100, Number(p.winProbability))),
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
    window.APP_DATA.saveOutsourcingPartner = async (p) => {
      throwIfError(
        await client.from('outsourcing_partners').upsert({
          id: p.id, type: p.type, company: p.company || null, name: p.name,
          grade: p.grade || null, status: p.status || 'active',
          contract_type: p.contractType || null,
          start_date: p.startDate || null, end_date: p.endDate || null,
          email: p.email || null, note: p.note || null,
          sort_order: p.sortOrder ?? 99,
        }),
        'outsourcing_partners 저장'
      );
    };
    window.APP_DATA.deleteOutsourcingPartner = async (id) => {
      throwIfError(
        await client.from('outsourcing_partners').delete().eq('id', id),
        'outsourcing_partners 삭제'
      );
    };
    window.APP_DATA.saveOutsourcingRecord = async (partnerId, monthId, data) => {
      if (data == null) {
        throwIfError(
          await client.from('outsourcing_records').delete().match({ partner_id: partnerId, month_id: monthId }),
          'outsourcing_records 삭제'
        );
      } else {
        throwIfError(
          await client.from('outsourcing_records').upsert({
            partner_id: partnerId,
            month_id:   monthId,
            billing_status: data.billingStatus || 'billing',
            revenue: data.revenue ?? null,
            cost:    data.cost    ?? null,
            project: data.project || null,
            note:    data.note    || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'partner_id,month_id' }),
          'outsourcing_records 저장'
        );
      }
    };

    client
      .channel('util-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utilization' }, () => {
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline' }, () => {
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outsourcing_partners' }, () => {
        window.dispatchEvent(new CustomEvent('data-changed'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outsourcing_records' }, () => {
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
