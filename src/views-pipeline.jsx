// 영업 파이프라인 — 인라인 편집 + 상세 모달 + 다중 선택 삭제
const { useState: useStatePipe, useMemo: useMemoPipe, useRef: useRefPipe } = React;

function SlackIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.7 30.7a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h4.4v4.4z" fill="#E01E5A"/>
      <path d="M22 30.7a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v11a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-11z" fill="#E01E5A"/>
      <path d="M26.4 19.7a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v4.4h-4.4z" fill="#36C5F0"/>
      <path d="M26.4 22a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-11a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h11z" fill="#36C5F0"/>
      <path d="M37.4 26.4a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-4.4v-4.4z" fill="#2EB67D"/>
      <path d="M35.1 26.4a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-11a4.4 4.4 0 0 1 4.4-4.4 4.4 4.4 0 0 1 4.4 4.4v11z" fill="#2EB67D"/>
      <path d="M30.7 37.4a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4v-4.4h4.4z" fill="#ECB22E"/>
      <path d="M30.7 35.1a4.4 4.4 0 0 1-4.4-4.4 4.4 4.4 0 0 1 4.4-4.4h11a4.4 4.4 0 0 1 4.4 4.4 4.4 4.4 0 0 1-4.4 4.4h-11z" fill="#ECB22E"/>
    </svg>
  );
}

async function fetchSlackSVChannels() {
  const syncToken = localStorage.getItem('SLACK_SYNC_TOKEN') || '';
  if (!syncToken.trim()) {
    throw new Error('설정 > 데이터 동기화에서 Slack 동기화 토큰을 먼저 입력해주세요.');
  }

  const res = await fetch('/api/slack-channels', {
    headers: { 'X-Resource-Hub-Token': syncToken.trim() },
  });
  const data = await readSlackResponse(res);
  if (!data.ok) {
    throw new Error(formatSlackError(data.error, res.status, data.detail));
  }

  const wsUrl = localStorage.getItem('SLACK_WORKSPACE_URL') || 'https://bigxdata-official.slack.com';
  return (data.channels || []).map(ch => {
    const svIdx = ch.name.toLowerCase().indexOf(':sv');
    const svName = svIdx >= 0 ? ch.name.slice(svIdx + 1) : ch.name;
    const client = svName.replace(/^sv\d{2}-/i, '').split('-')[0] || svName;
    return { id: ch.id, svName, client, slackUrl: wsUrl + '/archives/' + ch.id };
  });
}

async function readSlackResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (data) return data;
  return { ok: false, error: 'http_error', detail: text || `HTTP ${res.status}` };
}

function formatSlackError(error, status, detail) {
  const messages = {
    missing_slack_bot_token: '서버에 SLACK_BOT_TOKEN 환경변수가 없습니다. Vercel 환경변수를 확인해주세요.',
    missing_slack_sync_token: '서버에 SLACK_SYNC_TOKEN 환경변수가 없습니다. Vercel 환경변수를 확인해주세요.',
    invalid_sync_token: 'Slack 동기화 토큰이 올바르지 않습니다. 앱 설정의 토큰과 Vercel SLACK_SYNC_TOKEN이 같은지 확인해주세요.',
    slack_fetch_failed: 'Slack API 호출이 실패했습니다. SLACK_BOT_TOKEN 값 또는 Slack 앱 권한을 확인해주세요.',
    http_error: `Slack 동기화 API 호출 실패: HTTP ${status}`,
  };
  return detail ? `${messages[error] || error || `HTTP ${status}`} (${detail})` : (messages[error] || error || `HTTP ${status}`);
}

function normalizeWinProbability(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function formatWinProbability(value) {
  const n = normalizeWinProbability(value);
  return n == null ? '—' : `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

function pipelineSearchText(p) {
  return [
    p.priority, p.client, p.kind, p.status, p.sales, p.preSales,
    p.start, p.end, p.mm, p.winProbability, p.members, p.note,
  ].filter(v => v != null).join(' ').toLowerCase();
}

function getPipelineValue(p, key) {
  if (key === 'winProbability') return normalizeWinProbability(p.winProbability);
  return p[key];
}

function matchesPipelineColumn(p, key, value) {
  const raw = getPipelineValue(p, key);
  if (['priority', 'mm', 'winProbability'].includes(key)) {
    if (value.startsWith('>=') || value.startsWith('<=')) {
      const n = Number(value.slice(2));
      if (!Number.isFinite(n)) return true;
      return value.startsWith('>=') ? Number(raw || 0) >= n : Number(raw || 0) <= n;
    }
    if (value.startsWith('>') || value.startsWith('<')) {
      const n = Number(value.slice(1));
      if (!Number.isFinite(n)) return true;
      return value.startsWith('>') ? Number(raw || 0) > n : Number(raw || 0) < n;
    }
  }
  return String(raw ?? '').toLowerCase().includes(value);
}

function defaultSortDir(key) {
  return ['priority', 'mm', 'winProbability'].includes(key) ? 'desc' : 'asc';
}

function comparePipelineRows(a, b, key, dir) {
  const av = getPipelineValue(a, key);
  const bv = getPipelineValue(b, key);
  const emptyA = av == null || av === '';
  const emptyB = bv == null || bv === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let result;
  if (['priority', 'mm', 'winProbability'].includes(key)) {
    result = Number(av) - Number(bv);
  } else {
    result = String(av).localeCompare(String(bv), 'ko');
  }
  return dir === 'asc' ? result : -result;
}

function SortTh({ label, sortKey, sortConfig, onSort, align, width }) {
  const active = sortConfig.key === sortKey;
  return (
    <th style={{ textAlign: align || 'left', width }}>
      <button
        onClick={() => onSort(sortKey)}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          color: active ? 'var(--accent-strong)' : 'inherit',
          font: 'inherit',
          fontWeight: 700,
        }}
        title={`${label} 기준 정렬`}
      >
        {label} {active ? (sortConfig.dir === 'asc' ? '▲' : '▼') : ''}
      </button>
    </th>
  );
}

function ColumnFilter({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      className="input"
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ height: 26, minWidth: 58, padding: '3px 6px', fontSize: 11 }}
    />
  );
}

function ColumnSelect({ value, onChange, options }) {
  return (
    <select
      className="select"
      value={value || 'all'}
      onChange={e => onChange(e.target.value)}
      style={{ height: 26, minWidth: 72, padding: '2px 5px', fontSize: 11 }}
    >
      <option value="all">전체</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function PipelineView({ onProjectClick, onNewProject, onEditProject, onDataChange, dataVersion }) {
  const { PIPELINE, PIPELINE_STAGES, PROJECT_KINDS, SALES_PEOPLE } = window.APP_DATA;
  const [statusFilter, setStatusFilter] = useStatePipe('all');
  const [kindFilter, setKindFilter] = useStatePipe('all');
  const [salesFilter, setSalesFilter] = useStatePipe('all');
  const [search, setSearch] = useStatePipe('');
  const [sortConfig, setSortConfig] = useStatePipe({ key: 'start', dir: 'asc' });
  const [columnFilters, setColumnFilters] = useStatePipe({});
  const [includeWon, setIncludeWon] = useStatePipe(false);
  const [editingId, setEditingId] = useStatePipe(null); // 인라인 편집 중인 row id
  const [editDraft, setEditDraft] = useStatePipe(null);
  const [selected, setSelected] = useStatePipe(new Set()); // 다중선택
  const [menuOpenId, setMenuOpenId] = useStatePipe(null);
  const [syncOpen, setSyncOpen] = useStatePipe(false);
  const [syncing, setSyncing] = useStatePipe(false);
  const [syncResults, setSyncResults] = useStatePipe([]);

  const filtered = useMemoPipe(() => {
    let list = PIPELINE.slice();
    if (!includeWon) list = list.filter(p => normalizeWinProbability(p.winProbability) !== 100);
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (kindFilter !== 'all')   list = list.filter(p => p.kind === kindFilter);
    if (salesFilter !== 'all')  list = list.filter(p => p.sales === salesFilter);
    if (search)                 list = list.filter(p => pipelineSearchText(p).includes(search.toLowerCase()));
    Object.entries(columnFilters).forEach(([key, raw]) => {
      const value = String(raw || '').trim().toLowerCase();
      if (!value || value === 'all') return;
      list = list.filter(p => matchesPipelineColumn(p, key, value));
    });
    list.sort((a, b) => comparePipelineRows(a, b, sortConfig.key, sortConfig.dir));
    return list;
  }, [statusFilter, kindFilter, salesFilter, search, sortConfig, columnFilters, includeWon, dataVersion]);

  const stats = useMemoPipe(() => {
    const byStatus = {};
    const byKind = {};
    PIPELINE_STAGES.forEach(s => byStatus[s.id] = { cnt: 0, mm: 0 });
    PROJECT_KINDS.forEach(k => byKind[k] = 0);
    PIPELINE.forEach(p => {
      if (byStatus[p.status]) { byStatus[p.status].cnt++; byStatus[p.status].mm += (p.mm || 0); }
      if (byKind[p.kind] != null) byKind[p.kind]++;
    });
    return { byStatus, byKind };
  }, [PIPELINE, dataVersion]);

  // === 편집 action ===
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditDraft({ ...p });
    setMenuOpenId(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = async () => {
    if (!editDraft) return;
    const idx = PIPELINE.findIndex(p => p.id === editDraft.id);
    if (idx >= 0) PIPELINE[idx] = { ...editDraft };
    if (window.APP_DATA.savePipeline) {
      try { await window.APP_DATA.savePipeline(editDraft); } catch (e) { console.error(e); }
    }
    cancelEdit();
    onDataChange && onDataChange();
  };
  const updateDraft = (k, v) => setEditDraft({ ...editDraft, [k]: v });
  const setColumnFilter = (key, value) => setColumnFilters(prev => ({ ...prev, [key]: value }));
  const clearColumnFilters = () => setColumnFilters({});
  const sortBy = (key) => setSortConfig(prev => (
    prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultSortDir(key) }
  ));

  const deleteOne = async (id) => {
    if (!confirm('이 건을 삭제하시겠습니까?')) return;
    const idx = PIPELINE.findIndex(p => p.id === id);
    if (idx >= 0) PIPELINE.splice(idx, 1);
    if (window.APP_DATA.deletePipeline) {
      try { await window.APP_DATA.deletePipeline(id); } catch (e) { console.error(e); }
    }
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    setMenuOpenId(null);
    onDataChange && onDataChange();
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}건을 삭제하시겠습니까?`)) return;
    for (const id of selected) {
      const idx = PIPELINE.findIndex(p => p.id === id);
      if (idx >= 0) PIPELINE.splice(idx, 1);
      if (window.APP_DATA.deletePipeline) {
        try { await window.APP_DATA.deletePipeline(id); } catch (e) { console.error(e); }
      }
    }
    setSelected(new Set());
    onDataChange && onDataChange();
  };

  const changeStatusSelected = async (newStatus) => {
    if (selected.size === 0) return;
    for (const id of selected) {
      const idx = PIPELINE.findIndex(p => p.id === id);
      if (idx >= 0) {
        PIPELINE[idx].status = newStatus;
        if (window.APP_DATA.savePipeline) {
          try { await window.APP_DATA.savePipeline(PIPELINE[idx]); } catch (e) { console.error(e); }
        }
      }
    }
    setSelected(new Set());
    onDataChange && onDataChange();
  };

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const doSync = async () => {
    setSyncing(true);
    setSyncOpen(true);
    setSyncResults([]);
    try {
      const existingIds = new Set(PIPELINE.filter(p => p.slackChannelId).map(p => p.slackChannelId));
      const channels = await fetchSlackSVChannels();
      setSyncResults(channels.filter(ch => !existingIds.has(ch.id)));
    } catch (e) {
      alert('Slack 동기화 실패: ' + e.message);
      setSyncOpen(false);
    } finally {
      setSyncing(false);
    }
  };

  const addFromSlack = async (channels) => {
    const list = Array.isArray(channels) ? channels : [channels];
    for (const ch of list) {
      const newEntry = {
        id: 'prj' + String(Date.now()).slice(-6),
        priority: 1,
        client: ch.client,
        kind: 'PJ',
        status: '예정',
        sales: '',
        preSales: null,
        start: null,
        end: null,
        mm: null,
        winProbability: null,
        members: '',
        note: '[Slack] ' + ch.svName,
        slackChannelId: ch.id,
      };
      window.APP_DATA.PIPELINE.unshift(newEntry);
      if (window.APP_DATA.savePipeline) {
        try { await window.APP_DATA.savePipeline(newEntry); } catch (e) { console.error(e); alert('저장 실패: ' + e.message); }
      }
    }
    const addedIds = new Set(list.map(c => c.id));
    setSyncResults(prev => prev.filter(c => !addedIds.has(c.id)));
    onDataChange && onDataChange();
  };

  return (
    <div className="col gap-16">
      {/* 상태별 요약 카드 */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PIPELINE_STAGES.map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(statusFilter === s.id ? 'all' : s.id)}
              style={{
                textAlign: 'left', padding: '12px 14px',
                border: statusFilter === s.id ? `2px solid ${s.color}` : '1px solid var(--border)',
                background: statusFilter === s.id ? s.color + '11' : 'var(--bg-elev)',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span className="badge-dot" style={{ background: s.color }}></span>
                <span className="small bold" style={{ color: s.color }}>{s.id}</span>
              </div>
              <div className="num bold" style={{ fontSize: 22, lineHeight: 1 }}>{stats.byStatus[s.id].cnt}<span className="tiny subtle" style={{ marginLeft: 3 }}>건</span></div>
              <div className="tiny num subtle" style={{ marginTop: 4 }}>총 {stats.byStatus[s.id].mm.toFixed(1)}MM</div>
            </button>
          ))}
        </div>
      </div>

      {/* 필터/툴바 */}
      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
        {selected.size > 0 ? (
          <>
            <span className="small bold" style={{ padding: '6px 10px', background: 'var(--accent-weak)', color: 'var(--accent-strong)', borderRadius: 6 }}>
              {selected.size}건 선택됨
            </span>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }}></div>
            <select className="select btn-sm" style={{ width: 'auto', padding: '4px 8px' }} defaultValue="" onChange={e => { if (e.target.value) { changeStatusSelected(e.target.value); e.target.value=''; } }}>
              <option value="">상태 일괄 변경…</option>
              {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>→ {s.id}</option>)}
            </select>
            <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={deleteSelected}>
              <Icon name="trash" size={13} /> 선택 {selected.size}건 삭제
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>선택 해제</button>
          </>
        ) : (
          <>
            <select className="select" style={{ width: 'auto' }} value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
              <option value="all">전체 구분</option>
              {PROJECT_KINDS.map(k => <option key={k} value={k}>{k} ({stats.byKind[k]})</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={salesFilter} onChange={e => setSalesFilter(e.target.value)}>
              <option value="all">전체 Sales</option>
              {SALES_PEOPLE.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="input" placeholder="고객사 / 진행상세 검색" style={{ width: 240 }} value={search} onChange={e => setSearch(e.target.value)} />
          </>
        )}
        <div style={{ flex: 1 }}></div>
        <label className="small subtle" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
          <input type="checkbox" checked={includeWon} onChange={e => setIncludeWon(e.target.checked)} />
          100% 포함
        </label>
        <button className="btn btn-sm" onClick={clearColumnFilters} disabled={Object.values(columnFilters).every(v => !v)}>
          <Icon name="filter" size={13} /> 필터 초기화
        </button>
        <button className="btn btn-sm" onClick={doSync} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <SlackIcon size={13} /> 신규고객 동기화
        </button>
        <button className="btn btn-primary btn-sm" onClick={onNewProject}>
          <Icon name="plus" size={13} /> 신규 건 추가
        </button>
      </div>

      {/* 테이블 */}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
              </th>
              <SortTh label="#" sortKey="priority" sortConfig={sortConfig} onSort={sortBy} width={50} />
              <SortTh label="고객" sortKey="client" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="구분" sortKey="kind" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="상태" sortKey="status" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="수주확률" sortKey="winProbability" sortConfig={sortConfig} onSort={sortBy} align="right" />
              <SortTh label="Sales" sortKey="sales" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="Pre-Sales" sortKey="preSales" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="시작일" sortKey="start" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="종료일" sortKey="end" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="MM" sortKey="mm" sortConfig={sortConfig} onSort={sortBy} align="right" />
              <SortTh label="투입 인원" sortKey="members" sortConfig={sortConfig} onSort={sortBy} />
              <SortTh label="진행상세" sortKey="note" sortConfig={sortConfig} onSort={sortBy} />
              <th style={{ width: 40 }}></th>
            </tr>
            <tr>
              <th></th>
              <th><ColumnFilter value={columnFilters.priority} onChange={v => setColumnFilter('priority', v)} placeholder="#" /></th>
              <th><ColumnFilter value={columnFilters.client} onChange={v => setColumnFilter('client', v)} placeholder="고객" /></th>
              <th><ColumnSelect value={columnFilters.kind} onChange={v => setColumnFilter('kind', v)} options={PROJECT_KINDS} /></th>
              <th><ColumnSelect value={columnFilters.status} onChange={v => setColumnFilter('status', v)} options={PIPELINE_STAGES.map(s => s.id)} /></th>
              <th><ColumnFilter type="number" value={columnFilters.winProbability} onChange={v => setColumnFilter('winProbability', v)} placeholder="%" /></th>
              <th><ColumnSelect value={columnFilters.sales} onChange={v => setColumnFilter('sales', v)} options={SALES_PEOPLE} /></th>
              <th><ColumnFilter value={columnFilters.preSales} onChange={v => setColumnFilter('preSales', v)} placeholder="Pre" /></th>
              <th><ColumnFilter value={columnFilters.start} onChange={v => setColumnFilter('start', v)} placeholder="YYYY-MM" /></th>
              <th><ColumnFilter value={columnFilters.end} onChange={v => setColumnFilter('end', v)} placeholder="YYYY-MM" /></th>
              <th><ColumnFilter type="number" value={columnFilters.mm} onChange={v => setColumnFilter('mm', v)} placeholder="MM" /></th>
              <th><ColumnFilter value={columnFilters.members} onChange={v => setColumnFilter('members', v)} placeholder="인원" /></th>
              <th><ColumnFilter value={columnFilters.note} onChange={v => setColumnFilter('note', v)} placeholder="상세" /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isEditing = editingId === p.id;
              const isSelected = selected.has(p.id);
              if (isEditing) {
                return (
                  <InlineEditRow
                    key={p.id}
                    draft={editDraft}
                    onChange={updateDraft}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteOne(p.id)}
                  />
                );
              }
              return (
                <tr key={p.id} style={{ cursor: 'pointer', background: isSelected ? 'var(--accent-weak)' : undefined }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="tiny num subtle" onClick={() => onProjectClick(p.id)}>
                    {p.priority === 99 ? '◉' : p.priority === 55 ? '◐' : '○'} {p.priority}
                  </td>
                  <td onClick={() => onProjectClick(p.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="bold small">{p.client}</span>
                      {p.slackChannelId && (
                        <a
                          href={(localStorage.getItem('SLACK_WORKSPACE_URL') || 'https://bigxdata-official.slack.com') + '/archives/' + p.slackChannelId}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Slack 채널 열기"
                          style={{ color: '#4A154B', display: 'flex', alignItems: 'center', lineHeight: 1, flexShrink: 0 }}
                        >
                          <SlackIcon size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td onClick={() => onProjectClick(p.id)}><span className="badge" style={{ fontSize: 10 }}>{p.kind}</span></td>
                  <td onClick={() => onProjectClick(p.id)}><StatusPillInline status={p.status} /></td>
                  <td className="small num bold" style={{ textAlign: 'right' }} onClick={() => onProjectClick(p.id)}>
                    {formatWinProbability(p.winProbability)}
                  </td>
                  <td className="small" onClick={() => onProjectClick(p.id)}>{p.sales}</td>
                  <td className="small subtle" onClick={() => onProjectClick(p.id)}>{p.preSales || '—'}</td>
                  <td className="small num subtle" onClick={() => onProjectClick(p.id)}>{p.start?.slice(5) || '—'}</td>
                  <td className="small num subtle" onClick={() => onProjectClick(p.id)}>{p.end?.slice(5) || '—'}</td>
                  <td className="small num bold" style={{ textAlign: 'right' }} onClick={() => onProjectClick(p.id)}>{p.mm != null ? p.mm : '—'}</td>
                  <td className="small ellipsis" style={{ maxWidth: 180 }} onClick={() => onProjectClick(p.id)}>{p.members || <span className="subtle">미정</span>}</td>
                  <td className="tiny muted ellipsis" style={{ maxWidth: 260 }} onClick={() => onProjectClick(p.id)}>{p.note}</td>
                  <td style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}>⋮</button>
                    {menuOpenId === p.id && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 8, zIndex: 50,
                        background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6,
                        boxShadow: 'var(--shadow-lg)', minWidth: 160, padding: 4,
                      }}>
                        <MenuItem icon="edit" label="빠른 수정 (인라인)" onClick={() => startEdit(p)} />
                        <MenuItem icon="edit" label="상세 수정 (모달)" onClick={() => { onEditProject(p.id); setMenuOpenId(null); }} />
                        <MenuItem icon="briefcase" label="상세 보기" onClick={() => { onProjectClick(p.id); setMenuOpenId(null); }} />
                        <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }}></div>
                        <MenuItem icon="trash" label="삭제" danger onClick={() => deleteOne(p.id)} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="muted small" style={{ padding: 28, textAlign: 'center' }}>조건에 맞는 건이 없습니다</div>}
      </div>

      <div className="row gap-12" style={{ paddingLeft: 4 }}>
        <div className="tiny subtle">◉ 우선순위 99 · ◐ 55 · ○ 1</div>
        <div className="tiny subtle">· 행 <b>체크박스</b>로 다중 선택 → 일괄 삭제/상태변경</div>
        <div className="tiny subtle">· 행 끝 <b>⋮</b> 버튼으로 수정/삭제</div>
      </div>

      <SlackSyncModal
        open={syncOpen}
        syncing={syncing}
        results={syncResults}
        onClose={() => setSyncOpen(false)}
        onAdd={addFromSlack}
      />
    </div>
  );
}

// 인라인 편집 row
function InlineEditRow({ draft, onChange, onSave, onCancel, onDelete }) {
  const { PIPELINE_STAGES, PROJECT_KINDS } = window.APP_DATA;
  const inputStyle = { padding: '3px 6px', fontSize: 12, width: '100%', border: '1px solid var(--accent)', borderRadius: 4, background: 'white', color: 'var(--text)', fontFamily: 'inherit' };
  return (
    <tr style={{ background: 'var(--accent-weak)' }}>
      <td></td>
      <td>
        <select style={{ ...inputStyle, width: 54 }} value={draft.priority} onChange={e => onChange('priority', +e.target.value)}>
          <option value={99}>99</option><option value={55}>55</option><option value={1}>1</option>
        </select>
      </td>
      <td><input style={inputStyle} value={draft.client || ''} onChange={e => onChange('client', e.target.value)} autoFocus /></td>
      <td>
        <select style={{ ...inputStyle, width: 70 }} value={draft.kind} onChange={e => onChange('kind', e.target.value)}>
          {PROJECT_KINDS.map(k => <option key={k}>{k}</option>)}
        </select>
      </td>
      <td>
        <select style={{ ...inputStyle, width: 70 }} value={draft.status} onChange={e => onChange('status', e.target.value)}>
          {PIPELINE_STAGES.map(s => <option key={s.id}>{s.id}</option>)}
        </select>
      </td>
      <td>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          style={{ ...inputStyle, width: 68, textAlign: 'right' }}
          value={draft.winProbability ?? ''}
          onChange={e => onChange('winProbability', e.target.value === '' ? null : normalizeWinProbability(e.target.value))}
        />
      </td>
      <td><input style={{ ...inputStyle, width: 60 }} value={draft.sales || ''} onChange={e => onChange('sales', e.target.value)} /></td>
      <td><input style={{ ...inputStyle, width: 60 }} value={draft.preSales || ''} onChange={e => onChange('preSales', e.target.value)} /></td>
      <td><input type="date" style={{ ...inputStyle, width: 110 }} value={draft.start || ''} onChange={e => onChange('start', e.target.value)} /></td>
      <td><input type="date" style={{ ...inputStyle, width: 110 }} value={draft.end || ''} onChange={e => onChange('end', e.target.value || null)} /></td>
      <td><input type="number" step="0.1" style={{ ...inputStyle, width: 60, textAlign: 'right' }} value={draft.mm ?? ''} onChange={e => onChange('mm', e.target.value === '' ? null : +e.target.value)} /></td>
      <td><input style={inputStyle} value={draft.members || ''} onChange={e => onChange('members', e.target.value)} /></td>
      <td><input style={inputStyle} value={draft.note || ''} onChange={e => onChange('note', e.target.value)} /></td>
      <td>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px' }} onClick={onSave} title="저장 (Enter)"><Icon name="check" size={12} /></button>
          <button className="btn btn-sm" style={{ padding: '2px 6px' }} onClick={onCancel} title="취소 (Esc)"><Icon name="x" size={12} /></button>
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 10px', border: 'none', background: 'transparent',
        textAlign: 'left', fontSize: 12, cursor: 'pointer', borderRadius: 4,
        color: danger ? 'var(--danger)' : 'var(--text)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunken)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon name={icon} size={12} />
      {label}
    </button>
  );
}

function StatusPillInline({ status }) {
  const { PIPELINE_STAGES } = window.APP_DATA;
  const s = PIPELINE_STAGES.find(x => x.id === status);
  if (!s) return <span>{status}</span>;
  return <span className="stage-pill" style={{ background: s.color + '22', color: s.color }}>
    <span className="badge-dot" style={{ background: s.color }}></span>{status}
  </span>;
}

function SlackSyncModal({ open, syncing, results, onClose, onAdd }) {
  const [selected, setSelected] = useStatePipe(new Set());
  const [adding, setAdding] = useStatePipe(false);

  // results가 바뀌면(새 동기화 실행) 선택 초기화
  React.useEffect(() => { setSelected(new Set()); }, [results]);

  if (!open) return null;

  const allIds = results.map(c => c.id);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someChecked = allIds.some(id => selected.has(id));

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(allIds));
  };

  const handleAddSelected = async () => {
    const toAdd = results.filter(c => selected.has(c.id));
    if (!toAdd.length) return;
    setAdding(true);
    try {
      await onAdd(toAdd);
      setSelected(new Set());
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={580} title="신규 Slack 채널 동기화">
      {syncing ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><SlackIcon size={28} /></div>
          <div className="small">Slack 채널 목록을 가져오는 중...</div>
        </div>
      ) : results.length === 0 ? (
        <div style={{ padding: '36px 0', textAlign: 'center' }}>
          <div className="small bold" style={{ marginBottom: 4 }}>새로 추가된 SV 채널이 없습니다</div>
          <div className="tiny subtle">파이프라인에 없는 채널이 없거나 모두 연결되어 있습니다.</div>
        </div>
      ) : (
        <>
          {/* 헤더: 전체선택 + 카운트 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0 2px' }}>
            <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
              onChange={toggleAll} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent-strong)' }} />
            <span className="tiny subtle">
              파이프라인에 없는 SV 채널 <b>{results.length}개</b> 발견 · 체크 후 일괄 추가 가능
            </span>
          </div>

          {/* 채널 목록 */}
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {results.map(ch => (
              <div key={ch.id} onClick={() => toggle(ch.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 6, border: `1px solid ${selected.has(ch.id) ? 'var(--accent-strong)' : 'var(--border)'}`,
                background: selected.has(ch.id) ? 'var(--accent-weak)' : 'var(--bg-elev)',
                cursor: 'pointer',
              }}>
                <input type="checkbox" checked={selected.has(ch.id)} onChange={() => toggle(ch.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--accent-strong)' }} />
                <a href={ch.slackUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()} title="Slack에서 채널 열기"
                  style={{ color: '#4A154B', display: 'flex', flexShrink: 0 }}>
                  <SlackIcon size={16} />
                </a>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small bold" style={{ marginBottom: 1 }}>{ch.client}</div>
                  <div className="tiny subtle ellipsis">{ch.svName}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 푸터: 일괄 추가 버튼 */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-sm" onClick={onClose}>닫기</button>
            <button className="btn btn-sm btn-primary" onClick={handleAddSelected}
              disabled={selected.size === 0 || adding}
              style={{ minWidth: 110 }}>
              {adding ? '추가 중...' : `선택한 ${selected.size}개 추가`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

Object.assign(window, { PipelineView });
