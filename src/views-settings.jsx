// 설정 — 팀/인원 관리
const { useState: useStateS } = React;

function SettingsView(props) {
  const [tab, setTab] = useStateS('teams');
  return (
    <div className="col gap-16">
      <div className="segmented" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>팀 관리</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>인원 관리</button>
        <button className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>데이터 동기화</button>
      </div>
      {tab === 'teams' && <TeamsSettings {...props} />}
      {tab === 'users' && <UsersSettings {...props} />}
      {tab === 'sync'  && <SyncSettings />}
    </div>
  );
}

function TeamsSettings({ onNewTeam, onEditTeam, onDeleteTeam, onSaveTeam }) {
  const { TEAMS, USERS } = window.APP_DATA;
  const [editingId, setEditingId] = useStateS(null);
  const [editDraft, setEditDraft] = useStateS(null);
  const [menuOpenId, setMenuOpenId] = useStateS(null);

  const startInline = (t) => { setEditingId(t.id); setEditDraft({ ...t }); setMenuOpenId(null); };
  const cancelInline = () => { setEditingId(null); setEditDraft(null); };
  const saveInline = async () => { if (editDraft) { await onSaveTeam(editDraft, true); cancelInline(); } };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">팀 ({TEAMS.length})</div>
          <div className="card-sub">행 끝 ⋮ 버튼 → 수정/삭제 · 엑셀 코드(DM/DF/DS...) 유지</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-primary btn-sm" onClick={onNewTeam}><Icon name="plus" size={13} /> 팀 추가</button>
      </div>
      <table className="data-table">
        <thead><tr><th style={{ width: 80 }}>코드</th><th>팀명</th><th>재직/전체</th><th>색상</th><th style={{ width: 48 }}></th></tr></thead>
        <tbody>
          {TEAMS.map(t => {
            const members = USERS.filter(u => u.team === t.id);
            const active = members.filter(u => u.status === 'active');
            const isEditing = editingId === t.id;
            if (isEditing) {
              const inputStyle = { padding: '3px 6px', fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4, background: 'white', fontFamily: 'inherit' };
              return (
                <tr key={t.id} style={{ background: 'var(--accent-weak)' }}>
                  <td><span className="tiny num subtle" style={{ fontFamily: 'var(--font-mono)' }}>{t.id}</span></td>
                  <td><input style={{ ...inputStyle, width: '100%', maxWidth: 200 }} value={editDraft.name} onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} autoFocus /></td>
                  <td className="small num">{active.length} / {members.length}</td>
                  <td>
                    <input type="color" value={editDraft.color} onChange={e => setEditDraft({ ...editDraft, color: e.target.value })} style={{ width: 28, height: 22, border: 'none', cursor: 'pointer', verticalAlign: 'middle' }} />
                    <span className="tiny num subtle" style={{ marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{editDraft.color}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px' }} onClick={saveInline}><Icon name="check" size={12} /></button>
                    <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', marginLeft: 2 }} onClick={cancelInline}><Icon name="x" size={12} /></button>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={t.id}>
                <td><span className="tiny num subtle" style={{ fontFamily: 'var(--font-mono)' }}>{t.id}</span></td>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: t.color, borderRadius: 2 }}></span>
                  <span className="bold">{t.name}</span>
                </span></td>
                <td className="small num">{active.length} / {members.length}</td>
                <td>
                  <span style={{ display: 'inline-block', width: 18, height: 18, background: t.color, borderRadius: 3, verticalAlign: 'middle' }}></span>
                  <span className="tiny num subtle" style={{ marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{t.color}</span>
                </td>
                <td style={{ textAlign: 'right', position: 'relative' }}>
                  <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}>⋮</button>
                  {menuOpenId === t.id && (
                    <div style={{ position: 'absolute', top: '100%', right: 8, zIndex: 50, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: 'var(--shadow-lg)', minWidth: 180, padding: 4 }}>
                      <SMenuItem icon="edit" label="빠른 수정 (인라인)" onClick={() => startInline(t)} />
                      <SMenuItem icon="edit" label="상세 수정" onClick={() => { onEditTeam(t.id); setMenuOpenId(null); }} />
                      <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }}></div>
                      <SMenuItem icon="trash" label={members.length > 0 ? `삭제 (인원 ${members.length}명 있음)` : '삭제'} danger disabled={members.length > 0} onClick={() => { if (members.length === 0 && confirm(`팀 "${t.name}" 삭제?`)) { onDeleteTeam(t.id); setMenuOpenId(null); } else { setMenuOpenId(null); } }} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SMenuItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 10px', border: 'none', background: 'transparent',
        textAlign: 'left', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: 4,
        color: disabled ? 'var(--text-subtle)' : danger ? 'var(--danger)' : 'var(--text)',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-sunken)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon name={icon} size={12} />
      {label}
    </button>
  );
}

function UsersSettings({ onNewUser, onEditUser, onDeleteUser, onSaveUser }) {
  const { USERS, TEAMS, LEVELS, LEVEL_COLORS, STATUSES } = window.APP_DATA;
  const [teamFilter, setTeamFilter] = useStateS('all');
  const [statusFilter, setStatusFilter] = useStateS('all');
  const [search, setSearch] = useStateS('');
  const [selected, setSelected] = useStateS(new Set());
  const [editingId, setEditingId] = useStateS(null);
  const [editDraft, setEditDraft] = useStateS(null);
  const [menuOpenId, setMenuOpenId] = useStateS(null);

  const filtered = USERS.filter(u => {
    if (teamFilter !== 'all' && u.team !== teamFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search && !u.name.includes(search)) return false;
    return true;
  });

  const startInline = (u) => { setEditingId(u.id); setEditDraft({ ...u }); setMenuOpenId(null); };
  const cancelInline = () => { setEditingId(null); setEditDraft(null); };
  const saveInline = async () => { if (editDraft) { await onSaveUser(editDraft, true); cancelInline(); } };

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)));
  const bulkChangeStatus = async (newStatus) => {
    for (const id of selected) {
      const u = USERS.find(x => x.id === id);
      if (u) {
        u.status = newStatus;
        if (newStatus === 'resigned' && !u.resignedAt) u.resignedAt = new Date().toISOString().slice(0,10);
        await onSaveUser(u, true);
      }
    }
    setSelected(new Set());
  };
  const bulkDelete = async () => {
    if (!confirm(`선택한 ${selected.size}명을 삭제하시겠습니까?\n가동률 기록도 함께 삭제됩니다.`)) return;
    for (const id of selected) await onDeleteUser(id);
    setSelected(new Set());
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">인원 ({USERS.length}명)</div>
          <div className="card-sub">
            재직 {USERS.filter(u=>u.status==='active').length} ·
            휴직 {USERS.filter(u=>u.status==='leave').length} ·
            퇴사 {USERS.filter(u=>u.status==='resigned').length}
            · 행 끝 ⋮ 버튼으로 수정/삭제
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
        {selected.size > 0 ? (
          <>
            <span className="small bold" style={{ padding: '4px 10px', background: 'var(--accent-weak)', color: 'var(--accent-strong)', borderRadius: 6 }}>
              {selected.size}명 선택
            </span>
            <select className="select btn-sm" style={{ width: 'auto' }} defaultValue="" onChange={e => { if (e.target.value) { bulkChangeStatus(e.target.value); e.target.value=''; } }}>
              <option value="">상태 일괄 변경…</option>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>→ {v.label}</option>)}
            </select>
            <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={bulkDelete}><Icon name="trash" size={13} /> 삭제</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>선택 해제</button>
          </>
        ) : (
          <>
            <input className="input" placeholder="이름 검색" style={{ width: 140 }} value={search} onChange={e => setSearch(e.target.value)} />
            <select className="select" style={{ width: 'auto' }} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
              <option value="all">전체 팀</option>
              {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">전체 상태</option>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={onNewUser}><Icon name="plus" size={13} /> 입사자</button>
          </>
        )}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 30 }}><input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
            <th>이름</th>
            <th>팀</th>
            <th>등급</th>
            <th>상태</th>
            <th>비고</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => {
            const team = TEAMS.find(t => t.id === u.team);
            const isEditing = editingId === u.id;
            const isSelected = selected.has(u.id);

            if (isEditing) {
              const inputStyle = { padding: '3px 6px', fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4, background: 'white', fontFamily: 'inherit', width: '100%' };
              return (
                <tr key={u.id} style={{ background: 'var(--accent-weak)' }}>
                  <td></td>
                  <td><input style={inputStyle} value={editDraft.name} onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} autoFocus /></td>
                  <td>
                    <select style={{ ...inputStyle, width: 80 }} value={editDraft.team} onChange={e => setEditDraft({ ...editDraft, team: e.target.value })}>
                      {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select style={{ ...inputStyle, width: 70 }} value={editDraft.level} onChange={e => setEditDraft({ ...editDraft, level: e.target.value })}>
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </td>
                  <td>
                    <select style={{ ...inputStyle, width: 80 }} value={editDraft.status} onChange={e => setEditDraft({ ...editDraft, status: e.target.value })}>
                      {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td><input style={inputStyle} value={editDraft.note || ''} onChange={e => setEditDraft({ ...editDraft, note: e.target.value })} placeholder="비고" /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px' }} onClick={saveInline}><Icon name="check" size={12} /></button>
                    <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', marginLeft: 2 }} onClick={cancelInline}><Icon name="x" size={12} /></button>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={u.id} style={{ opacity: u.status === 'active' ? 1 : 0.6, background: isSelected ? 'var(--accent-weak)' : undefined }}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u.id)} />
                </td>
                <td><div className="row gap-8"><Avatar name={u.name} userId={u.id} size="sm" /><span className="bold small">{u.name}</span>{u.isManager && <span className="badge" style={{ fontSize: 9 }}>관리자</span>}</div></td>
                <td>
                  {team ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 3, height: 11, background: team.color, borderRadius: 2 }}></span>
                      <span className="small">{team.name}</span>
                    </span>
                  ) : <span className="tiny subtle">—</span>}
                </td>
                <td><span className="small" style={{ color: LEVEL_COLORS[u.level], fontWeight: 600 }}>{u.level}</span></td>
                <td><span className="badge" style={{ background: STATUSES[u.status].color + '22', color: STATUSES[u.status].color }}>{STATUSES[u.status].label}</span></td>
                <td className="tiny subtle ellipsis" style={{ maxWidth: 220 }}>
                  {u.joinedAt && `입사 ${u.joinedAt}`}
                  {u.resignedAt && `퇴사 ${u.resignedAt}`}
                  {u.note && (u.joinedAt || u.resignedAt ? ' · ' : '') + u.note}
                </td>
                <td style={{ textAlign: 'right', position: 'relative' }}>
                  <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}>⋮</button>
                  {menuOpenId === u.id && (
                    <div style={{ position: 'absolute', top: '100%', right: 8, zIndex: 50, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: 'var(--shadow-lg)', minWidth: 180, padding: 4 }}>
                      <SMenuItem icon="edit" label="빠른 수정 (인라인)" onClick={() => startInline(u)} />
                      <SMenuItem icon="edit" label="상세 수정" onClick={() => { onEditUser(u.id); setMenuOpenId(null); }} />
                      {u.status === 'active' && <SMenuItem icon="alert" label="퇴사 처리" onClick={async () => { const nu = { ...u, status: 'resigned', resignedAt: new Date().toISOString().slice(0,10) }; await onSaveUser(nu, true); setMenuOpenId(null); }} />}
                      <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }}></div>
                      <SMenuItem icon="trash" label="삭제" danger onClick={() => { if (confirm(`"${u.name}"님을 완전 삭제하시겠습니까?\n(가동률 기록도 함께 삭제됨. 퇴사 처리 권장)`)) { onDeleteUser(u.id); setMenuOpenId(null); } }} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="muted small" style={{ padding: 28, textAlign: 'center' }}>조건에 맞는 인원이 없습니다</div>}
    </div>
  );
}

function SyncSettings() {
  const [url] = useStateS(() => window.SUPABASE_URL || '');
  const [key] = useStateS(() => window.SUPABASE_ANON_KEY || '');
  const [showKey, setShowKey] = useStateS(false);
  const [diagnosing, setDiagnosing] = useStateS(false);
  const [diagResult, setDiagResult] = useStateS(null);

  const connected = !!window.__SUPABASE_CONNECTED__;

  const clearAndReload = () => {
    if (!confirm('브라우저에 예전에 저장된 Supabase URL/KEY만 지웁니다. 운영 앱은 배포 설정의 Supabase DB를 계속 사용합니다. 계속할까요?')) return;
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_ANON_KEY');
    location.reload();
  };

  const runDiagnosis = async () => {
    setDiagnosing(true);
    const result = await diagnoseSupabase();
    setDiagResult(result);
    setDiagnosing(false);
  };

  return (
    <div className="col gap-16">
      {/* 현재 연결 상태 */}
      <div className="card">
        <div className="card-header">
            <div>
              <div className="card-title">Supabase 연동 상태</div>
            <div className="card-sub">{connected ? '클라우드 DB와 실시간 동기화 중' : 'Supabase DB 미연결 - 저장 불가'}</div>
            </div>
          <div style={{ flex: 1 }}></div>
          {connected ? (
            <span className="badge" style={{ background: 'var(--success) ', color: 'white' }}>
              <span className="badge-dot" style={{ background: 'white' }}></span>연결됨
            </span>
          ) : (
              <span className="badge" style={{ background: 'var(--warn-weak)', color: 'var(--warn)' }}>
              <span className="badge-dot" style={{ background: 'var(--warn)' }}></span>미연결 / 저장 불가
              </span>
            )}
        </div>

        <div style={{ padding: 20 }}>
          <div className="field">
            <div className="field-label">SUPABASE URL</div>
            <input
              className="input"
              placeholder="https://xxxxxxxxxx.supabase.co"
              value={url}
              readOnly
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <div className="field-hint">운영 모드는 배포된 설정만 사용합니다. 브라우저 저장값은 사용하지 않습니다.</div>
          </div>

          <div className="field">
            <div className="field-label">ANON PUBLIC KEY</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                type={showKey ? 'text' : 'password'}
                readOnly
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, paddingRight: 50 }}
              />
              <button
                className="btn btn-sm btn-ghost"
                style={{ position: 'absolute', right: 4, top: 4, padding: '3px 8px', fontSize: 10 }}
                onClick={() => setShowKey(!showKey)}
              >{showKey ? '숨김' : '보기'}</button>
            </div>
            <div className="field-hint" style={{ color: 'var(--danger)' }}>
              ⚠ 반드시 <b>anon public</b> key 사용. <b>service_role</b> key 쓰면 보안 위험
            </div>
          </div>

          <div className="row gap-8" style={{ marginTop: 12 }}>
            <button className="btn btn-sm" onClick={runDiagnosis} disabled={diagnosing}>
              <Icon name="zap" size={13} /> {diagnosing ? '진단 중…' : '연결 진단'}
            </button>
            <div style={{ flex: 1 }}></div>
            {(localStorage.getItem('SUPABASE_URL') || localStorage.getItem('SUPABASE_ANON_KEY')) && (
              <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clearAndReload}>
                예전 브라우저 저장값 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 진단 결과 */}
      {diagResult && <DiagnosisPanel result={diagResult} onClose={() => setDiagResult(null)} />}

      {/* 배포 가이드 링크 */}
      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-weak)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
          <Icon name="briefcase" size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="small bold">아직 Supabase 계정이 없으신가요?</div>
          <div className="tiny subtle">프로젝트 생성 → SQL 2번 실행 → 키 복사까지 15분</div>
        </div>
        <a href="guide.html" target="_blank" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          배포 가이드 열기 <Icon name="chevronR" size={12} />
        </a>
      </div>

      {/* Slack 연동 */}
      <SlackSettings />

      {/* Export */}
      <div className="card">
        <div className="card-header"><div className="card-title">Export</div><div className="card-sub">백업 또는 엑셀로 내보내기</div></div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button className="btn" onClick={exportJSON}><Icon name="download" size={14} /> 전체 데이터 JSON</button>
          <button className="btn" onClick={exportCSV}><Icon name="download" size={14} /> 가동률 CSV (엑셀 호환)</button>
        </div>
      </div>
    </div>
  );
}

function SlackSettings() {
  const [token, setToken] = useStateS(() => localStorage.getItem('SLACK_SYNC_TOKEN') || '');
  const [wsUrl, setWsUrl] = useStateS(() => localStorage.getItem('SLACK_WORKSPACE_URL') || 'https://bigxdata-official.slack.com');
  const [showToken, setShowToken] = useStateS(false);
  const [testing, setTesting] = useStateS(false);
  const [testResult, setTestResult] = useStateS(null);
  const saved = !!localStorage.getItem('SLACK_SYNC_TOKEN');

  const save = () => {
    localStorage.setItem('SLACK_SYNC_TOKEN', token.trim());
    localStorage.setItem('SLACK_WORKSPACE_URL', wsUrl.trim().replace(/\/+$/, ''));
    alert('저장되었습니다. 영업 파이프라인 → 신규고객 동기화 버튼을 사용할 수 있습니다.');
  };
  const clear = () => {
    if (!confirm('Slack 동기화 토큰을 삭제하시겠습니까?')) return;
    localStorage.removeItem('SLACK_SYNC_TOKEN');
    localStorage.removeItem('SLACK_WORKSPACE_URL');
    setToken('');
    setWsUrl('https://bigxdata-official.slack.com');
    setTestResult(null);
  };
  const testConnection = async () => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      setTestResult({ ok: false, message: '동기화 토큰을 먼저 입력해주세요.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/slack-channels', {
        headers: { 'X-Resource-Hub-Token': cleanToken },
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (res.ok && data?.ok) {
        setTestResult({ ok: true, message: `연결 성공 · SV 채널 ${data.channels?.length || 0}개 확인` });
      } else {
        setTestResult({ ok: false, message: formatSlackSettingsError(data?.error, res.status, data?.detail || text) });
      }
    } catch (e) {
      setTestResult({ ok: false, message: '네트워크 오류: ' + e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 54 54" fill="none">
              <path d="M19.7 30.7a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h4.4v4.4z" fill="#E01E5A"/>
              <path d="M22 30.7a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v11a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-11z" fill="#E01E5A"/>
              <path d="M26.4 19.7a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v4.4h-4.4z" fill="#36C5F0"/>
              <path d="M26.4 22a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-11a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h11z" fill="#36C5F0"/>
              <path d="M37.4 26.4a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-4.4v-4.4z" fill="#2EB67D"/>
              <path d="M35.1 26.4a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-11a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v11z" fill="#2EB67D"/>
              <path d="M30.7 37.4a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-4.4h4.4z" fill="#ECB22E"/>
              <path d="M30.7 35.1a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h11a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-11z" fill="#ECB22E"/>
            </svg>
            Slack 연동
          </div>
          <div className="card-sub">서버 환경변수의 Slack Bot Token을 보호한 상태로 SV 채널을 동기화합니다</div>
        </div>
        <div style={{ flex: 1 }}></div>
        {saved ? (
          <span className="badge" style={{ background: 'var(--success)', color: 'white' }}>
            <span className="badge-dot" style={{ background: 'white' }}></span>설정됨
          </span>
        ) : (
          <span className="badge" style={{ background: 'var(--warn-weak)', color: 'var(--warn)' }}>
            <span className="badge-dot" style={{ background: 'var(--warn)' }}></span>미설정
          </span>
        )}
      </div>
      <div style={{ padding: 20 }}>
        <div className="field">
          <div className="field-label">동기화 토큰</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              type={showToken ? 'text' : 'password'}
              placeholder="관리자에게 받은 동기화 토큰"
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', flex: 1 }}
            />
            <button className="btn btn-sm btn-ghost" onClick={() => setShowToken(v => !v)} style={{ flexShrink: 0 }}>
              {showToken ? '숨기기' : '보기'}
            </button>
          </div>
          <div className="field-hint">Vercel 환경변수 SLACK_SYNC_TOKEN과 같은 값. Slack Bot Token은 브라우저에 입력하지 않습니다.</div>
        </div>
        <div className="field">
          <div className="field-label">워크스페이스 URL</div>
          <input
            className="input"
            placeholder="https://yourworkspace.slack.com"
            value={wsUrl}
            onChange={e => setWsUrl(e.target.value)}
          />
          <div className="field-hint">채널 링크 생성에 사용 · 기본값: https://bigxdata-official.slack.com</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!token.trim()}>
            <Icon name="check" size={13} /> 저장
          </button>
          <button className="btn btn-sm" onClick={testConnection} disabled={testing || !token.trim()}>
            <Icon name="zap" size={13} /> {testing ? '테스트 중...' : '연결 테스트'}
          </button>
          {saved && (
            <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear}>
              삭제
            </button>
          )}
        </div>
        {testResult && (
          <div style={{
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 6,
            background: testResult.ok ? 'var(--success-weak)' : 'var(--danger-weak)',
            color: testResult.ok ? 'var(--success)' : 'var(--danger)',
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSlackSettingsError(error, status, detail) {
  const messages = {
    missing_slack_bot_token: '서버에 SLACK_BOT_TOKEN 환경변수가 없습니다.',
    missing_slack_sync_token: '서버에 SLACK_SYNC_TOKEN 환경변수가 없습니다.',
    invalid_sync_token: '동기화 토큰이 일치하지 않습니다. Vercel의 SLACK_SYNC_TOKEN과 앱에 입력한 값이 같아야 합니다.',
    slack_fetch_failed: 'Slack API 호출 실패입니다. SLACK_BOT_TOKEN 값 또는 Slack 앱 권한을 확인해주세요.',
  };
  const base = messages[error] || `HTTP ${status}`;
  return detail ? `${base} (${detail})` : base;
}

// ===== 진단 로직 =====
async function diagnoseSupabase() {
  const checks = [];
  const add = (name, status, detail, fix) => checks.push({ name, status, detail, fix });

  // 1. SDK 로드 확인
  if (!window.supabase) {
    add('SDK 로드', 'fail', 'Supabase JS SDK가 브라우저에 로드되지 않음', 'HTML의 <script src="...supabase-js..."> 태그가 있는지 확인. 네트워크 문제일 수도.');
    return { ok: false, checks, summary: 'SDK 로드 실패로 더 이상 진행 불가' };
  }
  add('SDK 로드', 'ok', `@supabase/supabase-js 버전 ${window.supabase?.VERSION || '2.x'} 로드됨`);

  // 2. 배포 설정 URL 여부
  const url = window.SUPABASE_URL;
  if (!url) {
    add('URL 설정', 'fail', '배포 설정에 SUPABASE_URL 없음', 'index.html의 window.SUPABASE_URL 값을 확인하세요.');
    return { ok: false, checks, summary: 'URL 미설정' };
  }
  add('URL 설정', 'ok', url);

  // 3. URL 포맷 검증
  if (!url.startsWith('https://')) {
    add('URL 포맷', 'fail', `'https://'로 시작하지 않음: ${url.substring(0,20)}...`, 'URL은 https://xxx.supabase.co 형식이어야 합니다.');
  } else if (!url.includes('.supabase.co')) {
    add('URL 포맷', 'warn', `.supabase.co 포함 안 됨 — 셀프호스팅인가요?`, '공식 Supabase라면 URL에 .supabase.co가 포함되어야 합니다.');
  } else if (url.endsWith('/')) {
    add('URL 포맷', 'warn', '끝에 / (슬래시) 붙어있음', '자동으로 제거 가능. 저장 시 자동 처리됩니다.');
  } else {
    add('URL 포맷', 'ok', '형식 정상');
  }

  // 4. 배포 설정 KEY + role 검증
  const key = window.SUPABASE_ANON_KEY;
  if (!key) {
    add('KEY 설정', 'fail', '배포 설정에 SUPABASE_ANON_KEY 없음', 'index.html의 window.SUPABASE_ANON_KEY 값을 확인하세요.');
    return { ok: false, checks, summary: 'KEY 미설정' };
  }
  add('KEY 설정', 'ok', `${key.substring(0, 20)}... (길이 ${key.length})`);

  // JWT payload 디코드해서 role 확인
  try {
    const payload = JSON.parse(atob(key.split('.')[1]));
    if (payload.role === 'service_role') {
      add('KEY 종류', 'fail', '🚨 service_role key입니다. 브라우저 노출 금지', 'Supabase API 설정에서 반드시 "anon public" 키를 복사해서 사용하세요. service_role은 서버 전용입니다.');
    } else if (payload.role === 'anon') {
      add('KEY 종류', 'ok', `anon (프로젝트 ref: ${payload.ref || '?'})`);
    } else {
      add('KEY 종류', 'warn', `role=${payload.role} (anon 예상)`, 'anon public 키가 맞는지 다시 확인.');
    }
    // 만료 체크
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      add('KEY 만료', 'fail', `만료일 ${new Date(payload.exp * 1000).toLocaleDateString()}`, 'Supabase에서 키 재발급 필요.');
    }
  } catch (e) {
    add('KEY 디코드', 'fail', 'JWT 포맷 아님', 'anon key는 eyJhbGc... 로 시작하는 JWT입니다. 다시 복사.');
    return { ok: false, checks, summary: 'KEY 포맷 오류' };
  }

  // 5. 실제 접속 시도
  let client;
  try {
    client = window.supabase.createClient(url, key);
    add('클라이언트 생성', 'ok', '');
  } catch (e) {
    add('클라이언트 생성', 'fail', e.message, 'URL/KEY 다시 확인.');
    return { ok: false, checks, summary: '클라이언트 생성 실패' };
  }

  // 6. 네트워크 + 각 테이블 조회
  const tables = [
    { name: 'teams',       expect: 9,  desc: '팀 (9개)' },
    { name: 'users',       expect: 46, desc: '인원 (46명)' },
    { name: 'pipeline',    expect: 37, desc: '파이프라인 (37건)' },
    { name: 'utilization', expect: 0,  desc: '가동률 레코드 (최소 수백)', min: 100 },
  ];
  for (const t of tables) {
    try {
      const { count, error } = await client.from(t.name).select('*', { count: 'exact', head: true });
      if (error) {
        // 흔한 에러 분기
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          add(`테이블 ${t.name}`, 'fail', '테이블 없음', 'schema.sql을 Supabase SQL Editor에서 실행했는지 확인.');
        } else if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          add(`테이블 ${t.name}`, 'fail', 'JWT 인증 실패', 'anon KEY가 해당 프로젝트 것이 맞는지 확인. URL과 KEY가 서로 다른 프로젝트 것일 수 있음.');
        } else if (error.message?.includes('row-level security') || error.code === '42501') {
          add(`테이블 ${t.name}`, 'fail', 'RLS 정책으로 차단됨', 'schema.sql의 "public_read_*" 정책이 생성됐는지 확인. 재실행 권장.');
        } else {
          add(`테이블 ${t.name}`, 'fail', `${error.code}: ${error.message}`, 'schema.sql 재실행 필요할 수 있음.');
        }
      } else {
        const minExpected = t.min || t.expect;
        if (count === 0 && t.expect > 0) {
          add(`테이블 ${t.name}`, 'warn', `0행 — 비어있음`, 'seed.sql을 실행해서 초기 데이터를 넣어주세요.');
        } else if (count < minExpected) {
          add(`테이블 ${t.name}`, 'warn', `${count}행 (${t.desc} 예상보다 적음)`, 'seed.sql을 다시 실행하거나 부분 실패 확인.');
        } else {
          add(`테이블 ${t.name}`, 'ok', `${count}행`);
        }
      }
    } catch (e) {
      add(`테이블 ${t.name}`, 'fail', `네트워크 오류: ${e.message}`, 'URL 오타 확인. 회사 방화벽으로 *.supabase.co가 막혔을 수도 있음.');
    }
  }

  // 7. 쓰기 테스트 (upsert 후 즉시 삭제)
  try {
    const testId = '__diag_test_' + Date.now();
    const { error: upErr } = await client.from('pipeline').upsert({
      id: testId, priority: 1, client: '__진단테스트__', kind: 'PoC', status: '예정',
    });
    if (upErr) {
      add('쓰기 권한', 'fail', upErr.message, 'RLS 정책에 "public_write_*" 가 있는지 확인.');
    } else {
      await client.from('pipeline').delete().eq('id', testId);
      add('쓰기 권한', 'ok', 'upsert + delete 성공');
    }
  } catch (e) {
    add('쓰기 권한', 'fail', e.message, '');
  }

  // 최종 판정
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  return {
    ok: failed === 0,
    checks,
    summary: failed === 0
      ? (warned === 0 ? '✓ 모두 정상' : `✓ 정상 (경고 ${warned}개)`)
      : `✗ ${failed}개 실패${warned > 0 ? ` · 경고 ${warned}` : ''}`,
  };
}

function DiagnosisPanel({ result, onClose }) {
  const copyReport = () => {
    const text = [
      `=== Supabase 연결 진단 (${new Date().toLocaleString()}) ===`,
      `결과: ${result.summary}`,
      '',
      ...result.checks.map(c => {
        const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
        return `${icon} ${c.name}: ${c.detail || ''}${c.fix ? `\n  → ${c.fix}` : ''}`;
      }),
    ].join('\n');
    navigator.clipboard.writeText(text);
    alert('진단 결과가 클립보드에 복사되었습니다');
  };

  return (
    <div className="card" style={{ border: result.ok ? '1px solid var(--success)' : '1px solid var(--danger)' }}>
      <div className="card-header" style={{ background: result.ok ? 'var(--success-weak)' : 'var(--danger-weak)' }}>
        <div>
          <div className="card-title" style={{ color: result.ok ? 'var(--success)' : 'var(--danger)' }}>
            {result.ok ? '✓ 진단 통과' : '✗ 문제 발견'}
          </div>
          <div className="card-sub" style={{ color: 'var(--text-muted)' }}>{result.summary}</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-sm" onClick={copyReport}><Icon name="download" size={13} /> 보고서 복사</button>
        <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} /></button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {result.checks.map((c, i) => <DiagRow key={i} check={c} />)}
      </div>
    </div>
  );
}

function DiagRow({ check }) {
  const colors = {
    ok:   { bg: 'var(--success-weak)', fg: 'var(--success)', icon: '✓' },
    warn: { bg: 'var(--warn-weak)',    fg: 'var(--warn)',    icon: '⚠' },
    fail: { bg: 'var(--danger-weak)',  fg: 'var(--danger)',  icon: '✗' },
  }[check.status];
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: colors.bg, color: colors.fg,
        display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0,
      }}>{colors.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="small bold" style={{ color: colors.fg }}>{check.name}</div>
        {check.detail && <div className="tiny muted" style={{ marginTop: 2, wordBreak: 'break-all' }}>{check.detail}</div>}
        {check.fix && check.status !== 'ok' && (
          <div style={{ marginTop: 4, padding: '6px 10px', background: 'var(--bg-sunken)', borderRadius: 4, fontSize: 11, lineHeight: 1.5 }}>
            <b>→ 해결:</b> {check.fix}
          </div>
        )}
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
