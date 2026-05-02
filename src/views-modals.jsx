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
  const [saving, setSaving] = useStateM(false);

  React.useEffect(() => {
    if (open) {
      setValue(current?.value ?? 0);
      setClient(current?.client || '');
      setNote(current?.note || '');
      setMode(current?.note && !current?.client ? 'note' : 'work');
      setSaving(false);
    }
  }, [open, userId, weekId]);

  if (!open || !user || !week) return null;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        userId, weekId,
        value: mode === 'note' ? null : value,
        client: mode === 'note' ? null : (client || null),
        note: mode === 'note' ? (note || null) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };
  const clear = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ userId, weekId, value: null, client: null, note: null, clear: true });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} width={500}
      title="가동률 편집"
      footer={(
        <>
          {current && !current.empty && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear} disabled={saving}>비우기</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm" onClick={onClose} disabled={saving}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            <Icon name="check" size={13} /> {saving ? '저장 중...' : '저장'}
          </button>
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
    preSales: '', start: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2,'0')}-01`, end: `${new Date().getFullYear()}-${String(Math.min(new Date().getMonth() + 3, 12)).padStart(2,'0')}-30`, mm: null,
    winProbability: null, members: '', note: '',
  };
  const [form, setForm] = useStateM(emptyForm);

  React.useEffect(() => {
    if (open) {
      if (initialProject) setForm({ ...initialProject });
      else setForm(emptyForm);
    }
  }, [open, initialProject?.id]);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const priorityLabel = (priority) => {
    const n = Number(priority);
    if (n === 1) return '최우선';
    if (n === 55) return '집중';
    if (n === 99) return '관망';
    return String(priority ?? '—');
  };
  const clampProbability = (v) => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, n));
  };
  const save = () => {
    const id = form.id || ('prj' + String(Date.now()).slice(-6));
    onSave({ ...form, id, winProbability: clampProbability(form.winProbability) }, isEdit);
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
            <option value={1}>{priorityLabel(1)}</option>
            <option value={55}>{priorityLabel(55)}</option>
            <option value={99}>{priorityLabel(99)}</option>
          </select>
        </div>
        <div className="field"><div className="field-label">수주확률 (%)</div>
          <input className="input" type="number" min="0" max="100" step="1" value={form.winProbability ?? ''} onChange={e => update('winProbability', clampProbability(e.target.value))} placeholder="0~100" />
          <div className="field-hint">100%는 영업 파이프라인 목록에서 기본 제외됩니다.</div>
        </div>
        <div></div>
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

// ===== 파트너 / 프리랜서 모달 =====
function PartnerModal({ open, initialPartner, onClose, onSave, onDelete }) {
  const {
    OUTSOURCING_PARTNER_TYPES,
    OUTSOURCING_GRADES,
    OUTSOURCING_CONTRACT_TYPES,
    OUTSOURCING_PARTNER_STATUSES,
  } = window.APP_DATA;

  const isEdit = !!initialPartner;
  const empty = {
    id: '', type: 'partner', company: '', name: '', grade: '중급',
    status: 'active', contractType: '월정계약',
    startDate: '', endDate: '', email: '', note: '',
  };
  const [form, setForm] = useStateM(empty);
  const [saving, setSaving] = useStateM(false);

  React.useEffect(() => {
    if (open) {
      setForm(initialPartner ? { ...initialPartner } : { ...empty, id: generatePartnerId() });
      setSaving(false);
    }
  }, [open, initialPartner]);

  if (!open) return null;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { alert('이름을 입력해주세요.'); return; }
    if (saving) return;
    setSaving(true);
    try { await onSave(form, isEdit); onClose(); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`"${form.name}" 님을 삭제하시겠습니까?\n(월별 기록도 함께 삭제됩니다)`)) return;
    setSaving(true);
    try { await onDelete(form.id); onClose(); }
    finally { setSaving(false); }
  };

  const inputStyle = { padding: '3px 6px', fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4, background: 'white', fontFamily: 'inherit', width: '100%' };

  return (
    <Modal open={open} onClose={onClose} width={520}
      title={isEdit ? '외주 인력 수정' : '외주 인력 추가'}
      footer={(
        <>
          {isEdit && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={del} disabled={saving}>삭제</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
          </button>
        </>
      )}
    >
      <div style={{ padding: '16px 20px 8px' }}>
        {/* 구분 & 상태 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">구분 *</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(OUTSOURCING_PARTNER_TYPES).map(([k, label]) => (
                <button key={k} className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: form.type === k ? 'var(--accent)' : 'var(--bg-elev)',
                    color:      form.type === k ? 'white' : 'var(--text)',
                    borderColor: form.type === k ? 'var(--accent)' : 'var(--border)',
                  }}
                  onClick={() => update('type', k)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <div className="field-label">상태</div>
            <select className="select" value={form.status} onChange={e => update('status', e.target.value)}>
              {Object.entries(OUTSOURCING_PARTNER_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 회사명 & 이름 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">회사명</div>
            <input className="input" placeholder="예: (주)ABC솔루션" value={form.company} onChange={e => update('company', e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">이름 *</div>
            <input className="input" placeholder="예: 홍길동" value={form.name} onChange={e => update('name', e.target.value)} autoFocus={!isEdit} />
          </div>
        </div>

        {/* 등급 & 계약유형 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">등급</div>
            <select className="select" value={form.grade} onChange={e => update('grade', e.target.value)}>
              {OUTSOURCING_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="field-label">계약유형</div>
            <select className="select" value={form.contractType || ''} onChange={e => update('contractType', e.target.value)}>
              <option value="">선택 안 함</option>
              {OUTSOURCING_CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* 계약기간 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">계약 시작일</div>
            <input className="input" type="date" value={form.startDate || ''} onChange={e => update('startDate', e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">계약 종료일</div>
            <input className="input" type="date" value={form.endDate || ''} onChange={e => update('endDate', e.target.value)} />
          </div>
        </div>

        {/* 이메일 */}
        <div className="field">
          <div className="field-label">이메일</div>
          <input className="input" type="email" placeholder="예: name@company.com" value={form.email || ''} onChange={e => update('email', e.target.value)} />
        </div>

        {/* 비고 */}
        <div className="field">
          <div className="field-label">비고</div>
          <input className="input" placeholder="특이사항 메모" value={form.note || ''} onChange={e => update('note', e.target.value)} />
        </div>

        {!isEdit && (
          <div className="field-hint" style={{ marginTop: 4 }}>ID: {form.id}</div>
        )}
      </div>
    </Modal>
  );
}

function generatePartnerId() {
  const existing = (window.APP_DATA?.OUTSOURCING_PARTNERS || []).map(p => p.id);
  let n = existing.length + 1;
  let id;
  do {
    id = 'op' + String(n).padStart(3, '0');
    n++;
  } while (existing.includes(id));
  return id;
}

Object.assign(window, { OverrideModal, PipelineModal, TeamModal, UserModal, PartnerModal });
