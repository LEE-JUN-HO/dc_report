// 메인 앱
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tone": "enterprise",
  "density": "comfortable",
  "accentHue": "indigo"
}/*EDITMODE-END*/;

function App() {
  const [view, setView] = useState(() => localStorage.getItem('rh_view') || 'dashboard');
  const [detailParams, setDetailParams] = useState(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideParams, setOverrideParams] = useState(null);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineEditTarget, setPipelineEditTarget] = useState(null); // null이면 신규
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamEditTarget, setTeamEditTarget] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userEditTarget, setUserEditTarget] = useState(null);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [editModeOn, setEditModeOn] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => { localStorage.setItem('rh_view', view); }, [view]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditModeOn(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditModeOn(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Supabase 초기 로드 및 Realtime 변경 시 전체 재렌더링
  useEffect(() => {
    const handler = () => setDataVersion(v => v + 1);
    window.addEventListener('data-changed', handler);
    return () => window.removeEventListener('data-changed', handler);
  }, []);

  const updateTweak = (key, value) => {
    const next = { ...tweaks, [key]: value };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
  };

  useEffect(() => {
    document.body.dataset.tone = tweaks.tone === 'enterprise' ? '' : tweaks.tone;
    document.body.dataset.density = tweaks.density || 'comfortable';
    const hueMap = {
      indigo: { accent: '#2563EB', weak: '#DBEAFE', strong: '#1D4ED8' },
      emerald:{ accent: '#059669', weak: '#D1FAE5', strong: '#047857' },
      rose:   { accent: '#E11D48', weak: '#FFE4E6', strong: '#BE123C' },
      violet: { accent: '#7C3AED', weak: '#EDE9FE', strong: '#6D28D9' },
      amber:  { accent: '#D97706', weak: '#FEF3C7', strong: '#B45309' },
    };
    const h = hueMap[tweaks.accentHue] || hueMap.indigo;
    if (tweaks.tone === 'enterprise') {
      document.body.style.setProperty('--accent', h.accent);
      document.body.style.setProperty('--accent-weak', h.weak);
      document.body.style.setProperty('--accent-strong', h.strong);
    } else {
      document.body.style.removeProperty('--accent');
      document.body.style.removeProperty('--accent-weak');
      document.body.style.removeProperty('--accent-strong');
    }
  }, [tweaks]);

  const navigate = (v, param) => {
    if (v === 'user' || v === 'team' || v === 'project') {
      setDetailParams({ view: v, id: param });
      setView(v);
    } else {
      setDetailParams(null);
      setView(v);
    }
  };

  const openOverride = (userId, weekId, current) => {
    setOverrideParams({ userId, weekId, current });
    setOverrideOpen(true);
  };
  const saveOverride = async ({ userId, weekId, value, client, note, clear }) => {
    let savedRow = null;
    if (window.APP_DATA.saveUtilization) {
      try {
        savedRow = await window.APP_DATA.saveUtilization(
          userId, weekId,
          clear ? null : value,
          clear ? null : (client || null),
          clear ? null : (note || null),
        );
      } catch (e) {
        console.error('[ResourceHub] 가동률 저장 실패:', e);
        alert('저장 실패: ' + e.message);
        throw e;
      }
    }

    const { UTIL } = window.APP_DATA;
    if (!UTIL[userId]) UTIL[userId] = {};
    if (clear) {
      delete UTIL[userId][weekId];
    } else {
      UTIL[userId][weekId] = savedRow ? {
        value: savedRow.value == null ? null : Number(savedRow.value),
        client: savedRow.client || null,
        note: savedRow.note || null,
      } : { value, client, note };
    }
    setDataVersion(v => v + 1);
  };
  const openNewProject = () => { setPipelineEditTarget(null); setPipelineModalOpen(true); };
  const openEditProject = (id) => {
    const p = window.APP_DATA.PIPELINE.find(x => x.id === id);
    if (p) { setPipelineEditTarget({ ...p }); setPipelineModalOpen(true); }
  };
  const savePipelineEntry = async (p, isEdit) => {
    const { PIPELINE } = window.APP_DATA;
    const clean = {
      ...p,
      winProbability: p.winProbability == null || p.winProbability === ''
        ? null
        : Math.max(0, Math.min(100, Number(p.winProbability))),
    };
    if (isEdit) {
      const idx = PIPELINE.findIndex(x => x.id === clean.id);
      if (idx >= 0) PIPELINE[idx] = clean;
    } else {
      PIPELINE.unshift(clean);
    }
    if (window.APP_DATA.savePipeline) {
      try { await window.APP_DATA.savePipeline(clean); } catch (e) { console.error(e); alert('파이프라인 저장 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };
  const deletePipelineEntry = async (id) => {
    const { PIPELINE } = window.APP_DATA;
    const idx = PIPELINE.findIndex(x => x.id === id);
    if (idx >= 0) PIPELINE.splice(idx, 1);
    if (window.APP_DATA.deletePipeline) {
      try { await window.APP_DATA.deletePipeline(id); } catch (e) { console.error(e); alert('파이프라인 삭제 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };
  const onPipelineDataChange = () => setDataVersion(v => v + 1);

  // ===== 팀 CRUD =====
  const openNewTeam = () => { setTeamEditTarget(null); setTeamModalOpen(true); };
  const openEditTeam = (id) => {
    const t = window.APP_DATA.TEAMS.find(x => x.id === id);
    if (t) { setTeamEditTarget({ ...t }); setTeamModalOpen(true); }
  };
  const saveTeamEntry = async (t, isEdit) => {
    const { TEAMS } = window.APP_DATA;
    if (isEdit) {
      const idx = TEAMS.findIndex(x => x.id === t.id);
      if (idx >= 0) TEAMS[idx] = t;
    } else {
      if (TEAMS.some(x => x.id === t.id)) { alert('이미 존재하는 팀 코드입니다: ' + t.id); return; }
      TEAMS.push(t);
    }
    if (window.APP_DATA.saveTeam) {
      try { await window.APP_DATA.saveTeam(t); } catch (e) { console.error(e); alert('저장 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };
  const deleteTeamEntry = async (id) => {
    const { TEAMS, USERS } = window.APP_DATA;
    const memberCount = USERS.filter(u => u.team === id).length;
    if (memberCount > 0) {
      alert(`이 팀에 ${memberCount}명의 인원이 있습니다. 먼저 인원을 다른 팀으로 이동하거나 삭제해주세요.`);
      return;
    }
    const idx = TEAMS.findIndex(x => x.id === id);
    if (idx >= 0) TEAMS.splice(idx, 1);
    if (window.APP_DATA.deleteTeam) {
      try { await window.APP_DATA.deleteTeam(id); } catch (e) { console.error(e); alert('삭제 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };

  // ===== 인원 CRUD =====
  const openNewUser = () => { setUserEditTarget(null); setUserModalOpen(true); };
  const openEditUser = (id) => {
    const u = window.APP_DATA.USERS.find(x => x.id === id);
    if (u) { setUserEditTarget({ ...u }); setUserModalOpen(true); }
  };
  const saveUserEntry = async (u, isEdit) => {
    const { USERS } = window.APP_DATA;
    if (isEdit) {
      const idx = USERS.findIndex(x => x.id === u.id);
      if (idx >= 0) USERS[idx] = u;
    } else {
      if (USERS.some(x => x.id === u.id)) { alert('이미 존재하는 ID입니다: ' + u.id); return; }
      USERS.push(u);
    }
    if (window.APP_DATA.saveUser) {
      try { await window.APP_DATA.saveUser(u); } catch (e) { console.error(e); alert('저장 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };
  const deleteUserEntry = async (id) => {
    const { USERS, UTIL } = window.APP_DATA;
    const idx = USERS.findIndex(x => x.id === id);
    if (idx >= 0) USERS.splice(idx, 1);
    // 로컬 UTIL도 정리 (Supabase는 CASCADE)
    delete UTIL[id];
    if (window.APP_DATA.deleteUser) {
      try { await window.APP_DATA.deleteUser(id); } catch (e) { console.error(e); alert('삭제 실패: ' + e.message); }
    }
    setDataVersion(v => v + 1);
  };
  const onSettingsDataChange = () => setDataVersion(v => v + 1);

  const APP = window.APP_DATA || {};
  const pipelineCount = (APP.PIPELINE || []).length;
  const kpiTarget = APP.KPI_TARGET != null ? APP.KPI_TARGET : 0.85;
  const header = {
    dashboard:   { title: '대시보드',        sub: '경영진 관점 · 실시간 가동 현황' },
    utilization: { title: '주간 가동률',     sub: `팀 × 주차 · 목표 ${(kpiTarget * 100).toFixed(0)}%` },
    pipeline:    { title: '영업 파이프라인', sub: `총 ${pipelineCount}건` },
    settings:    { title: '설정',            sub: '팀 · 인원 · 동기화' },
    user:        { title: '팀원 상세',       sub: '' },
    team:        { title: '팀 상세',         sub: '' },
    project:     { title: '프로젝트 상세',   sub: '' },
  }[view] || { title: '', sub: '' };

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} />
      <div className="main">
        <div className="topbar">
          <div>
            <span className="topbar-title">{header.title}</span>
            <span className="topbar-sub">{header.sub}</span>
          </div>
          <div className="topbar-spacer"></div>
          <div className="topbar-actions">
            <a href="guide.html" target="_blank" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              <Icon name="zap" size={13} /> Supabase 배포하기
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-sunken)' }}>
              <Avatar name="허순구" userId="u001" size="sm" />
              <span className="small bold">허순구</span>
              <span className="tiny subtle">관리자</span>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="content-narrow">
            {view === 'dashboard'   && <DashboardView onNavigate={navigate} dataVersion={dataVersion} />}
            {view === 'utilization' && <UtilizationView onOverride={openOverride} onSelectUser={(id) => navigate('user', id)} dataVersion={dataVersion} />}
            {view === 'pipeline'    && <PipelineView
              onProjectClick={(id) => navigate('project', id)}
              onNewProject={openNewProject}
              onEditProject={openEditProject}
              onDataChange={onPipelineDataChange}
              dataVersion={dataVersion}
            />}
            {view === 'settings'    && <SettingsView
              onNewTeam={openNewTeam}
              onEditTeam={openEditTeam}
              onDeleteTeam={deleteTeamEntry}
              onNewUser={openNewUser}
              onEditUser={openEditUser}
              onDeleteUser={deleteUserEntry}
              onSaveUser={saveUserEntry}
              onSaveTeam={saveTeamEntry}
              onDataChange={onSettingsDataChange}
            />}
            {view === 'user'    && detailParams && <UserDetail userId={detailParams.id} onBack={() => navigate('utilization')} onProjectClick={(id) => navigate('project', id)} />}
            {view === 'team'    && detailParams && <TeamDetail teamId={detailParams.id} onBack={() => navigate('dashboard')} onSelectUser={(id) => navigate('user', id)} />}
            {view === 'project' && detailParams && <ProjectDetail
              projectId={detailParams.id}
              onBack={() => navigate('pipeline')}
              onEdit={openEditProject}
              onDelete={(id) => {
                if (confirm('이 건을 삭제하시겠습니까?')) {
                  deletePipelineEntry(id);
                  navigate('pipeline');
                }
              }}
            />}
          </div>
        </div>
      </div>

      <OverrideModal open={overrideOpen} {...(overrideParams || {})} onClose={() => setOverrideOpen(false)} onSave={saveOverride} />
      <PipelineModal
        open={pipelineModalOpen}
        initialProject={pipelineEditTarget}
        onClose={() => setPipelineModalOpen(false)}
        onSave={savePipelineEntry}
        onDelete={deletePipelineEntry}
      />
      <TeamModal
        open={teamModalOpen}
        initialTeam={teamEditTarget}
        onClose={() => setTeamModalOpen(false)}
        onSave={saveTeamEntry}
        onDelete={deleteTeamEntry}
      />
      <UserModal
        open={userModalOpen}
        initialUser={userEditTarget}
        onClose={() => setUserModalOpen(false)}
        onSave={saveUserEntry}
        onDelete={deleteUserEntry}
      />

      {editModeOn && <TweaksPanel tweaks={tweaks} onChange={updateTweak} onClose={() => setEditModeOn(false)} />}
    </div>
  );
}

function Sidebar({ view, onNavigate }) {
  const items = [
    { id: 'dashboard',   label: '대시보드',    icon: 'dashboard' },
    { id: 'utilization', label: '주간 가동률', icon: 'grid' },
    { id: 'pipeline',    label: '영업 파이프라인', icon: 'pipeline' },
  ];
  const items2 = [{ id: 'settings', label: '설정', icon: 'settings' }];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">RH</div>
        <div>
          <div className="sidebar-brand-name">Resource Hub</div>
          <div className="sidebar-brand-sub">2026</div>
        </div>
      </div>
      <div className="sidebar-section-label">Main</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`sidebar-item ${view === item.id || (item.id === 'utilization' && (view === 'user')) || (item.id === 'pipeline' && view === 'project') || (item.id === 'dashboard' && view === 'team') ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="sidebar-item-icon"><Icon name={item.icon} size={15} /></span>
          {item.label}
        </button>
      ))}
      <div className="sidebar-section-label">Admin</div>
      {items2.map(item => (
        <button key={item.id} className={`sidebar-item ${view === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}>
          <span className="sidebar-item-icon"><Icon name={item.icon} size={15} /></span>
          {item.label}
        </button>
      ))}
      <div className="sidebar-footer">
        <div>v0.2 · 2026-04-20 (W16)</div>
        <div style={{ marginTop: 4 }}>실데이터 반영본</div>
      </div>
    </aside>
  );
}

function TweaksPanel({ tweaks, onChange, onClose }) {
  return (
    <div className="tweaks-panel">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <span className="tweaks-title" style={{ margin: 0, flex: 1 }}>Tweaks</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={13} /></button>
      </div>
      <div className="tweaks-group">
        <div className="tweaks-group-label">톤앤매너</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[
            { id: 'enterprise', label: 'Enterprise' },
            { id: 'saas',       label: 'Modern' },
            { id: 'bold',       label: 'Bold' },
          ].map(o => (
            <button key={o.id} className="btn btn-sm" style={{
              background: tweaks.tone === o.id ? 'var(--accent)' : 'var(--bg-elev)',
              color: tweaks.tone === o.id ? 'white' : 'var(--text)',
              borderColor: tweaks.tone === o.id ? 'var(--accent)' : 'var(--border)',
              padding: '6px 4px', fontSize: 11,
            }} onClick={() => onChange('tone', o.id)}>{o.label}</button>
          ))}
        </div>
      </div>
      {tweaks.tone === 'enterprise' && (
        <div className="tweaks-group">
          <div className="tweaks-group-label">Accent</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'indigo',  color: '#2563EB' },
              { id: 'emerald', color: '#059669' },
              { id: 'rose',    color: '#E11D48' },
              { id: 'violet',  color: '#7C3AED' },
              { id: 'amber',   color: '#D97706' },
            ].map(o => (
              <button key={o.id} onClick={() => onChange('accentHue', o.id)} style={{
                width: 28, height: 28, borderRadius: 6, background: o.color,
                border: tweaks.accentHue === o.id ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', padding: 0,
              }}></button>
            ))}
          </div>
        </div>
      )}
      <div className="tweaks-group">
        <div className="tweaks-group-label">밀도</div>
        <Segmented
          value={tweaks.density || 'comfortable'}
          onChange={(v) => onChange('density', v)}
          options={[
            { value: 'compact',     label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
          ]}
        />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        💡 자동 저장됩니다
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
