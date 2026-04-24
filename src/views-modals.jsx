// 셀 편집 모달 + 신규 프로젝트 모달
const { useState: useStateM } = React;

// ===== 가동률 셀 편집 모달 =====
function OverrideModal({ open, onClose, userId, weekId, current, onSave }) {
  const { USERS, WEEKS } = window.APP_DATA;
  const user = userId && USERS.find(u => u.id === userId);
  const week = weekId && WEEKS.find(w => w.id === weekId);

  const [value, setValue] = useStateM(current?.value ?? 0);
  const [client, setClient] = useStateM(current?.client || '');
  const [note, setNote] = useStateM(current?.note || '');
  const [mode, setMode] = useStateM(current?.note && !current?.client ? 'note' : 'work'); // work / note

  React.useEffect(() => {
    if (open) {
      setValue(current?.value ?? 0);
      setClient(current?.client || '');
      setNote(current?.note || '');
      setMode(current?.note && !current?.client ? 'note' : 'work');
    }
  }, [open, userId, weekId]);

  if (!open || !user || !week) return null;

  const save = () => {
    onSave({
      userId, weekId,
      value: mode === 'note' ? null : value,
      client: mode === 'note' ? null : (client || null),
      note: note || null,
    });
    onClose();
  };
  const clear = () => {
    onSave({ userId, weekId, value: null, client: null, note: null, clear: true });
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} width={500}
      title="가동률 편집"
      footer={(
        <>
          {current && !current.empty && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear}>비우기</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={save}><Icon name="check" size={13} /> 저장</button>
        </>
      )}
    >
      <div className="row gap-12" style={{ marginBottom: 16 }}>
        <Avatar name={user.name} userId={user.id} size="md" />
        <div>
          <div className="bold">{user.name}</div>
          <div className="tiny subtle">{user.team} · {user.level} · {week.label} ({week.range})</div>
        </div>
      </div>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'work', label: '업무 (고객사 + 빌링)' },
          { value: 'note', label: '부재 (휴가/교육/대기)' },
        ]}
      />

      {mode === 'work' ? (
        <>
          <div className="field" style={{ marginTop: 14 }}>
            <div className="field-label">고객사</div>
            <input className="input" value={client} onChange={e => setClient(e.target.value)} placeholder="예: 삼성물산, AXA, 새마을금고..." list="client-suggest" />
            <datalist id="client-suggest">
              {getClientSuggestions().map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field">
            <div className="field-label">빌링 비율</div>
            <div className="row gap-6">
              {[0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0].map(v => (
                <button
                  key={v}
                  onClick={() => setValue(v)}
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: value === v ? heatColor(v) : 'var(--bg-elev)',
                    color: value === v ? heatTextColor(v) : 'var(--text)',
                    fontWeight: 600,
                    border: value === v ? `1px solid ${heatColor(v)}` : '1px solid var(--border)',
                  }}
                >{v.toFixed(1)}</button>
              ))}
            </div>
            <div className="field-hint">엑셀과 동일 · 0(미투입) → 1.0(풀)</div>
          </div>
        </>
      ) : (
        <div className="field" style={{ marginTop: 14 }}>
          <div className="field-label">사유</div>
          <div className="row gap-6" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            {['휴가', '교육', '제안 준비', '대기', '출산휴가', '병가', '구정'].map(preset => (
              <button key={preset} className="btn btn-sm" onClick={() => setNote(preset)} style={{ fontSize: 11 }}>{preset}</button>
            ))}
          </div>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="직접 입력 — 예: 휴가(~3/23), Snowflake 학습" />
        </div>
      )}
    </Modal>
  );
}

function getClientSuggestions() {
  const set = new Set();
  const { UTIL, PIPELINE } = window.APP_DATA;
  Object.values(UTIL).forEach(wm => {
    Object.values(wm).forEach(c => { if (c.client) set.add(c.client); });
  });
  PIPELINE.forEach(p => set.add(p.client));
  return [...set].sort();
}

// ===== 신규 / 수정 파이프라인 모달 =====
function PipelineModal({ open, onClose, onSave, onDelete, initialProject }) {
  const { PROJECT_KINDS, PIPELINE_STAGES, SALES_PEOPLE } = window.APP_DATA;
  const isEdit = !!initialProject;
  const emptyForm = {
    priority: 99, client: '', kind: 'PJ', status: '예정', sales: '',
    preSales: '', start: '2026-06-01', end: '2026-08-31', mm: null,
    members: '', note: '',
  };
  const [form, setForm] = useStateM(emptyForm);

  React.useEffect(() => {
    if (open) {
      if (initialProject) setForm({ ...initialProject });
      else setForm(emptyForm);
    }
  }, [open, initialProject?.id]);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const save = () => {
    const id = form.id || ('prj' + String(Date.now()).slice(-6));
    onSave({ ...form, id }, isEdit);
    onClose();
  };
  const handleDelete = () => {
    if (!confirm('이 건을 삭제하시겠습니까?')) return;
    onDelete && onDelete(form.id);
    onClose();
  };
  return (
    <Modal
      open={open} onClose={onClose} width={640}
      title={isEdit ? `파이프라인 수정 — ${initialProject?.client || ''}` : '신규 파이프라인 건'}
      footer={(
        <>
          {isEdit && <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}><Icon name="trash" size={13} /> 삭제</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.client}><Icon name="check" size={13} /> {isEdit ? '저장' : '추가'}</button>
        </>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <div className="field-label">고객</div>
          <input className="input" value={form.client} onChange={e => update('client', e.target.value)} placeholder="예: SK하이닉스" />
        </div>
        <div className="field"><div className="field-label">구분</div>
          <select className="select" value={form.kind} onChange={e => update('kind', e.target.value)}>
            {PROJECT_KINDS.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="field"><div className="field-label">상태</div>
          <select className="select" value={form.status} onChange={e => update('status', e.target.value)}>
            {PIPELINE_STAGES.map(s => <option key={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div className="field"><div className="field-label">Sales</div>
          <input className="input" list="sales-dl" value={form.sales} onChange={e => update('sales', e.target.value)} />
          <datalist id="sales-dl">{SALES_PEOPLE.map(s => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="field"><div className="field-label">Pre-Sales</div>
          <input className="input" value={form.preSales} onChange={e => update('preSales', e.target.value)} />
        </div>
        <div className="field"><div className="field-label">시작일</div>
          <input className="input" type="date" value={form.start || ''} onChange={e => update('start', e.target.value)} />
        </div>
        <div className="field"><div className="field-label">종료일</div>
          <input className="input" type="date" value={form.end || ''} onChange={e => update('end', e.target.value)} />
        </div>
        <div className="field"><div className="field-label">MM</div>
          <input className="input" type="number" step="0.5" value={form.mm || ''} onChange={e => update('mm', e.target.value ? +e.target.value : null)} />
        </div>
        <div className="field"><div className="field-label">우선순위</div>
          <select className="select" value={form.priority} onChange={e => update('priority', +e.target.value)}>
            <option value={99}>◉ 99 (최상위)</option>
            <option value={55}>◐ 55 (중간)</option>
            <option value={1}>○ 1 (일반)</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <div className="field-label">투입 예상 인원</div>
          <input className="input" value={form.members} onChange={e => update('members', e.target.value)} placeholder="예: 허순구, 김진규 × 2명" />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <div className="field-label">진행상세 (한줄요약)</div>
          <input className="input" value={form.note} onChange={e => update('note', e.target.value)} placeholder="예: 5/7 JH 6/1 시작 예정" />
        </div>
      </div>
    </Modal>
  );
}

// ===== 팀 신규/수정 모달 =====
function TeamModal({ open, onClose, onSave, onDelete, initialTeam }) {
  const isEdit = !!initialTeam;
  const empty = { id: '', name: '', color: '#6366F1' };
  const [form, setForm] = useStateM(empty);

  React.useEffect(() => {
    if (open) setForm(initialTeam ? { ...initialTeam } : empty);
  }, [open, initialTeam?.id]);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const save = () => {
    if (!form.id || !form.name) return;
    onSave({ ...form }, isEdit);
    onClose();
  };
  const handleDelete = () => {
    if (!confirm(`팀 "${form.name}"을 삭제하시겠습니까?\n소속 인원이 있으면 삭제되지 않습니다.`)) return;
    onDelete(form.id);
    onClose();
  };

  const COLORS = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316','#64748B','#EF4444','#3B82F6','#84CC16'];

  return (
    <Modal
      open={open} onClose={onClose} width={460}
      title={isEdit ? `팀 수정 — ${initialTeam?.name}` : '신규 팀'}
      footer={(
        <>
          {isEdit && <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}><Icon name="trash" size={13} /> 삭제</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.id || !form.name}>
            <Icon name="check" size={13} /> {isEdit ? '저장' : '추가'}
          </button>
        </>
      )}
    >
      <div className="field">
        <div className="field-label">팀 코드 (ID)</div>
        <input className="input" value={form.id} onChange={e => update('id', e.target.value.toUpperCase().replace(/\s/g,''))} placeholder="예: DM, DF, DX" disabled={isEdit} maxLength={8} style={{ fontFamily: 'var(--font-mono)' }} />
        <div className="field-hint">엑셀 코드와 동일하게 2~3글자 권장 · 저장 후 변경 불가</div>
      </div>
      <div className="field">
        <div className="field-label">팀명</div>
        <input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="예: DM (혹은 DM팀)" />
      </div>
      <div className="field">
        <div className="field-label">색상</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => update('color', c)} style={{
              width: 32, height: 32, borderRadius: 6, background: c,
              border: form.color === c ? '3px solid var(--text)' : '2px solid transparent',
              cursor: 'pointer', padding: 0,
            }}></button>
          ))}
          <input type="color" value={form.color} onChange={e => update('color', e.target.value)} style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }} />
        </div>
      </div>
    </Modal>
  );
}

// ===== 인원 신규/수정 모달 =====
function UserModal({ open, onClose, onSave, onDelete, initialUser }) {
  const { TEAMS, LEVELS, STATUSES } = window.APP_DATA;
  const isEdit = !!initialUser;
  const empty = {
    id: '', name: '', team: TEAMS[0]?.id || 'DM', level: '초급', status: 'active',
    isManager: false, joinedAt: null, resignedAt: null, note: '',
  };
  const [form, setForm] = useStateM(empty);

  React.useEffect(() => {
    if (open) {
      if (initialUser) setForm({ ...initialUser });
      else setForm({ ...empty, id: generateUserId() });
    }
  }, [open, initialUser?.id]);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const save = () => {
    if (!form.id || !form.name) return;
    onSave({ ...form }, isEdit);
    onClose();
  };
  const handleDelete = () => {
    if (!confirm(`"${form.name}"님을 삭제하시겠습니까?\n가동률 기록도 함께 삭제됩니다.\n\n퇴사자는 삭제 대신 상태를 '퇴사'로 변경하는 것을 권장합니다.`)) return;
    onDelete(form.id);
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} width={560}
      title={isEdit ? `팀원 수정 — ${initialUser?.name}` : '신규 팀원 / 입사자'}
      footer={(
        <>
          {isEdit && <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}><Icon name="trash" size={13} /> 삭제</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.id || !form.name}>
            <Icon name="check" size={13} /> {isEdit ? '저장' : '추가'}
          </button>
        </>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <div className="field-label">이름</div>
          <input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="홍길동" autoFocus />
        </div>
        <div className="field">
          <div className="field-label">ID (내부)</div>
          <input className="input" value={form.id} onChange={e => update('id', e.target.value)} disabled={isEdit} style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <div className="field">
          <div className="field-label">팀</div>
          <select className="select" value={form.team} onChange={e => update('team', e.target.value)}>
            {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field">
          <div className="field-label">등급</div>
          <select className="select" value={form.level} onChange={e => update('level', e.target.value)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <div className="field-label">상태</div>
          <select className="select" value={form.status} onChange={e => update('status', e.target.value)}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="field">
          <div className="field-label">관리자 여부</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, background: 'var(--bg-elev)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isManager} onChange={e => update('isManager', e.target.checked)} />
            <span className="small">관리자 / 팀장</span>
          </label>
        </div>
        <div className="field">
          <div className="field-label">입사일 (선택)</div>
          <input type="date" className="input" value={form.joinedAt || ''} onChange={e => update('joinedAt', e.target.value || null)} />
        </div>
        <div className="field">
          <div className="field-label">퇴사일 (선택)</div>
          <input type="date" className="input" value={form.resignedAt || ''} onChange={e => update('resignedAt', e.target.value || null)} />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <div className="field-label">비고</div>
          <input className="input" value={form.note || ''} onChange={e => update('note', e.target.value)} placeholder="예: 9월 출산휴가 예정" />
        </div>
      </div>
    </Modal>
  );
}

function generateUserId() {
  const existing = (window.APP_DATA?.USERS || []).map(u => u.id);
  let n = existing.length + 1;
  let id;
  do {
    id = 'u' + String(n).padStart(3, '0');
    n++;
  } while (existing.includes(id));
  return id;
}

Object.assign(window, { OverrideModal, PipelineModal, TeamModal, UserModal });
