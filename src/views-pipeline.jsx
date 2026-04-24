// 영업 파이프라인 — 인라인 편집 + 상세 모달 + 다중 선택 삭제
const { useState: useStatePipe, useMemo: useMemoPipe, useRef: useRefPipe } = React;

function PipelineView({ onProjectClick, onNewProject, onEditProject, onDataChange }) {
  const { PIPELINE, PIPELINE_STAGES, PROJECT_KINDS, SALES_PEOPLE } = window.APP_DATA;
  const [statusFilter, setStatusFilter] = useStatePipe('all');
  const [kindFilter, setKindFilter] = useStatePipe('all');
  const [salesFilter, setSalesFilter] = useStatePipe('all');
  const [search, setSearch] = useStatePipe('');
  const [sortKey, setSortKey] = useStatePipe('start');
  const [editingId, setEditingId] = useStatePipe(null); // 인라인 편집 중인 row id
  const [editDraft, setEditDraft] = useStatePipe(null);
  const [selected, setSelected] = useStatePipe(new Set()); // 다중선택
  const [menuOpenId, setMenuOpenId] = useStatePipe(null);

  const filtered = useMemoPipe(() => {
    let list = PIPELINE.slice();
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (kindFilter !== 'all')   list = list.filter(p => p.kind === kindFilter);
    if (salesFilter !== 'all')  list = list.filter(p => p.sales === salesFilter);
    if (search)                 list = list.filter(p => p.client.includes(search) || (p.note||'').includes(search));
    if (sortKey === 'start')    list.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    else if (sortKey === 'mm')  list.sort((a, b) => (b.mm||0) - (a.mm||0));
    else if (sortKey === 'priority') list.sort((a, b) => a.priority - b.priority);
    return list;
  }, [statusFilter, kindFilter, salesFilter, search, sortKey]);

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
  }, [PIPELINE]);

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
        <select className="select" style={{ width: 'auto' }} value={sortKey} onChange={e => setSortKey(e.target.value)}>
          <option value="start">시작일 순</option>
          <option value="mm">MM 큰 순</option>
          <option value="priority">우선순위</option>
        </select>
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
              <th style={{ width: 50 }}>#</th>
              <th>고객</th>
              <th>구분</th>
              <th>상태</th>
              <th>Sales</th>
              <th>Pre-Sales</th>
              <th>시작일</th>
              <th>종료일</th>
              <th style={{ textAlign: 'right' }}>MM</th>
              <th>투입 인원</th>
              <th>진행상세</th>
              <th style={{ width: 40 }}></th>
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
                  <td onClick={() => onProjectClick(p.id)}><span className="bold small">{p.client}</span></td>
                  <td onClick={() => onProjectClick(p.id)}><span className="badge" style={{ fontSize: 10 }}>{p.kind}</span></td>
                  <td onClick={() => onProjectClick(p.id)}><StatusPillInline status={p.status} /></td>
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

Object.assign(window, { PipelineView });
