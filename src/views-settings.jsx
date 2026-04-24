// 설정 — 팀/인원 관리
const { useState: useStateS } = React;

function SettingsView() {
  const [tab, setTab] = useStateS('teams');
  return (
    <div className="col gap-16">
      <div className="segmented" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>팀 관리</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>인원 관리</button>
        <button className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>데이터 동기화</button>
      </div>
      {tab === 'teams' && <TeamsSettings />}
      {tab === 'users' && <UsersSettings />}
      {tab === 'sync'  && <SyncSettings />}
    </div>
  );
}

function TeamsSettings() {
  const { TEAMS, USERS } = window.APP_DATA;
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">팀 ({TEAMS.length})</div>
          <div className="card-sub">엑셀 원본 코드(DM/DF/DS...) 유지</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> 팀 추가</button>
      </div>
      <table className="data-table">
        <thead><tr><th>코드</th><th>재직/전체</th><th>색상</th><th style={{ textAlign: 'right' }}>관리</th></tr></thead>
        <tbody>
          {TEAMS.map(t => {
            const members = USERS.filter(u => u.team === t.id);
            const active = members.filter(u => u.status === 'active');
            return (
              <tr key={t.id}>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: t.color, borderRadius: 2 }}></span>
                  <span className="bold">{t.name}</span>
                </span></td>
                <td className="small num">{active.length} / {members.length}</td>
                <td>
                  <span style={{ display: 'inline-block', width: 18, height: 18, background: t.color, borderRadius: 3, verticalAlign: 'middle' }}></span>
                  <span className="tiny num subtle" style={{ marginLeft: 6 }}>{t.color}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm btn-ghost"><Icon name="edit" size={12} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UsersSettings() {
  const { USERS, TEAMS, LEVELS, LEVEL_COLORS, STATUSES } = window.APP_DATA;
  const [teamFilter, setTeamFilter] = useStateS('all');
  const [statusFilter, setStatusFilter] = useStateS('all');
  const filtered = USERS.filter(u => {
    if (teamFilter !== 'all' && u.team !== teamFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">인원 ({USERS.length}명)</div>
          <div className="card-sub">재직 {USERS.filter(u=>u.status==='active').length} · 휴직 {USERS.filter(u=>u.status==='leave').length} · 퇴사 {USERS.filter(u=>u.status==='resigned').length}</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <select className="select" style={{ width: 'auto' }} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">전체 팀</option>
          {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">전체 상태</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> 입사자</button>
      </div>
      <table className="data-table">
        <thead><tr><th>이름</th><th>팀</th><th>등급</th><th>상태</th><th>비고</th><th style={{ textAlign: 'right' }}>관리</th></tr></thead>
        <tbody>
          {filtered.map(u => {
            const team = TEAMS.find(t => t.id === u.team);
            return (
              <tr key={u.id} style={{ opacity: u.status === 'active' ? 1 : 0.6 }}>
                <td><div className="row gap-8"><Avatar name={u.name} userId={u.id} size="sm" /><span className="bold small">{u.name}</span>{u.isManager && <span className="badge" style={{ fontSize: 9 }}>관리자</span>}</div></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 3, height: 11, background: team.color, borderRadius: 2 }}></span>
                    <span className="small">{team.name}</span>
                  </span>
                </td>
                <td><span className="small" style={{ color: LEVEL_COLORS[u.level], fontWeight: 600 }}>{u.level}</span></td>
                <td><span className="badge" style={{ background: STATUSES[u.status].color + '22', color: STATUSES[u.status].color }}>{STATUSES[u.status].label}</span></td>
                <td className="tiny subtle">
                  {u.joinedAt && `입사 ${u.joinedAt}`}
                  {u.resignedAt && `퇴사 ${u.resignedAt}`}
                  {u.note && ' · ' + u.note}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm btn-ghost"><Icon name="edit" size={12} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SyncSettings() {
  return (
    <div className="col gap-16">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Supabase 연동 상태</div>
            <div className="card-sub">클라우드 DB와 동기화</div>
          </div>
          <div style={{ flex: 1 }}></div>
          <span className="badge" style={{ background: 'var(--warn-weak)', color: 'var(--warn)' }}>
            <span className="badge-dot" style={{ background: 'var(--warn)' }}></span>
            로컬 데모
          </span>
        </div>
        <div style={{ padding: 20 }}>
          <div className="small" style={{ lineHeight: 1.6 }}>
            현재는 <b>브라우저 메모리</b>에서 동작하는 데모 버전입니다. 실사용하려면:
          </div>
          <ol className="small" style={{ lineHeight: 1.8, paddingLeft: 20, marginTop: 10 }}>
            <li><a href="배포가이드.html" target="_blank" style={{ color: 'var(--accent)' }}>배포 가이드</a>의 Supabase 세팅 10분 따라하기</li>
            <li>발급받은 <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>를 입력</li>
            <li>Tweaks → "Supabase 연동" 토글</li>
          </ol>
          <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-sunken)', borderRadius: 8 }}>
            <div className="tiny bold">⚠ 보안 주의</div>
            <div className="tiny" style={{ marginTop: 4, lineHeight: 1.5 }}>
              로그인 없이 공용 접근으로 구성되므로, <b>URL을 아는 사람은 누구나 데이터 수정 가능</b>합니다.
              고객사명/MM 등 민감 정보가 있다면 사내망 배포 또는 간단한 passphrase 추가를 권장합니다.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Export</div></div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button className="btn" onClick={exportJSON}><Icon name="download" size={14} /> 전체 데이터 JSON</button>
          <button className="btn" onClick={exportCSV}><Icon name="download" size={14} /> 가동률 CSV (엑셀 호환)</button>
        </div>
      </div>
    </div>
  );
}

function exportJSON() {
  const { TEAMS, USERS, UTIL, PIPELINE, WEEKS } = window.APP_DATA;
  const blob = new Blob([JSON.stringify({ TEAMS, USERS, UTIL, PIPELINE, WEEKS: WEEKS.map(w => ({ id: w.id, range: w.range })) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `resource-hub-${Date.now()}.json`; a.click();
}
function exportCSV() {
  const { USERS, WEEKS, computeUtilization } = window.APP_DATA;
  const rows = [['팀', '이름', '등급', '상태', ...WEEKS.map(w => w.id)]];
  USERS.forEach(u => {
    rows.push([u.team, u.name, u.level, u.status, ...WEEKS.map(w => {
      const d = computeUtilization(u.id, w.id);
      if (d.client && d.value) return `${d.client}:${d.value}`;
      if (d.note) return d.note;
      return '';
    })]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `utilization-${Date.now()}.csv`; a.click();
}

Object.assign(window, { SettingsView });
