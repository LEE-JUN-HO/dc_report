// 셀 편집 모달 + 신규 프로젝트 모달
const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;

// 고객사명으로 Slack URL 조회 (파이프라인 기준)
function getSlackUrlForClientM(clientName) {
  if (!clientName) return null;
  const { PIPELINE } = window.APP_DATA;
  const wsUrl = localStorage.getItem('SLACK_WORKSPACE_URL') || 'https://bigxdata-official.slack.com';
  const p = PIPELINE.find(p => p.client === clientName);
  if (p?.slackChannelId) return wsUrl + '/archives/' + p.slackChannelId;
  // svName으로도 조회
  const svMatch = PIPELINE.find(p => {
    const m = (p.note || '').match(/\[Slack\]\s*(.+)/i);
    return m && m[1].trim().toLowerCase() === clientName.toLowerCase();
  });
  if (svMatch?.slackChannelId) return wsUrl + '/archives/' + svMatch.slackChannelId;
  return null;
}

// ===== 가동률 셀 편집 모달 =====
function OverrideModal({ open, onClose, userId, weekId, current, onSave, readOnly = false }) {
  const { USERS, WEEKS } = window.APP_DATA;
  const user = userId && USERS.find(u => u.id === userId);
  const week = weekId && WEEKS.find(w => w.id === weekId);

  const [inputMode, setInputMode] = useStateM('single'); // 'single' | 'range'
  const [value, setValue] = useStateM(current?.value ?? 0);
  // clients: string[] — 저장 시 '|'로 조인, 로드 시 '|'로 분리
  const [clients, setClients] = useStateM(() => current?.client ? current.client.split('|').map(s => s.trim()).filter(Boolean) : []);
  const [note, setNote] = useStateM(current?.note || '');
  const [mode, setMode] = useStateM(current?.note && !current?.client ? 'note' : 'work');
  const [rangeStart, setRangeStart] = useStateM(weekId || '');
  const [rangeEnd, setRangeEnd] = useStateM(weekId || '');
  const [saving, setSaving] = useStateM(false);

  React.useEffect(() => {
    if (open) {
      setValue(current?.value ?? 0);
      setClients(current?.client ? current.client.split('|').map(s => s.trim()).filter(Boolean) : []);
      setNote(current?.note || '');
      setMode(current?.note && !current?.client ? 'note' : 'work');
      setInputMode('single');
      setRangeStart(weekId || '');
      setRangeEnd(weekId || '');
      setSaving(false);
    }
  }, [open, userId, weekId]);

  if (!open || !user || !week) return null;

  // 기간 모드에서 선택된 주차 목록 계산 (훅 없이 일반 변수로)
  let rangeWeekIds;
  if (inputMode !== 'range') {
    rangeWeekIds = [weekId];
  } else {
    const si = WEEKS.findIndex(w => w.id === rangeStart);
    const ei = WEEKS.findIndex(w => w.id === rangeEnd);
    if (si < 0 || ei < 0) {
      rangeWeekIds = [];
    } else {
      const from = Math.min(si, ei);
      const to   = Math.max(si, ei);
      rangeWeekIds = WEEKS.slice(from, to + 1).map(w => w.id);
    }
  }

  let rangeLabel = '';
  if (rangeWeekIds.length > 0) {
    const ws = rangeWeekIds.map(id => WEEKS.find(w => w.id === id)).filter(Boolean);
    rangeLabel = ws.length === 1
      ? ws[0].label + ' (' + ws[0].range + ')'
      : ws[0].label + ' ~ ' + ws[ws.length - 1].label + ' · ' + ws.length + '주';
  }

  const save = async () => {
    if (saving) return;
    if (inputMode === 'range' && rangeWeekIds.length === 0) {
      alert('기간을 올바르게 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        userId,
        weekId,
        weekIds: inputMode === 'range' ? rangeWeekIds : undefined,
        value: mode === 'note' ? null : value,
        client: mode === 'note' ? null : (clients.length > 0 ? clients.join('|') : null),
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
      await onSave({
        userId,
        weekId,
        weekIds: inputMode === 'range' ? rangeWeekIds : undefined,
        value: null, client: null, note: null, clear: true,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = saving
    ? '저장 중...'
    : inputMode === 'range' && rangeWeekIds.length > 1
      ? `${rangeWeekIds.length}주 저장`
      : '저장';

  return (
    <Modal
      open={open} onClose={onClose} width={520}
      title={readOnly ? '가동률 확인' : '가동률 편집'}
      footer={(
        <>
          {!readOnly && inputMode === 'single' && current && !current.empty && (
            <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear} disabled={saving}>비우기</button>
          )}
          {!readOnly && inputMode === 'range' && rangeWeekIds.length > 0 && (
            <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear} disabled={saving}>
              {rangeWeekIds.length}주 비우기
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          {readOnly ? (
            <button className="btn btn-primary btn-sm" onClick={onClose}>닫기</button>
          ) : (
            <>
              <button className="btn btn-sm" onClick={onClose} disabled={saving}>취소</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                <Icon name="check" size={13} /> {saveLabel}
              </button>
            </>
          )}
        </>
      )}
    >
      {/* 사용자 정보 */}
      <div className="row gap-12" style={{ marginBottom: 16 }}>
        <Avatar name={user.name} userId={user.id} size="md" />
        <div>
          <div className="bold">{user.name}</div>
          <div className="tiny subtle">{user.team} · {user.level}</div>
        </div>
      </div>

      {/* 단일/기간 탭 — 읽기 전용에서는 숨김 */}
      {!readOnly && (
        <Segmented
          value={inputMode}
          onChange={setInputMode}
          options={[
            { value: 'single', label: '단일 주 입력' },
            { value: 'range',  label: '기간 입력' },
          ]}
        />
      )}

      {/* 주차 표시 (단일) 또는 기간 선택 (range) */}
      {(readOnly || inputMode === 'single') ? (
        <div className="tiny subtle" style={{ marginTop: 8, marginBottom: 4 }}>
          {week.label} ({week.range})
        </div>
      ) : (
        <div style={{ marginTop: 10, marginBottom: 4, padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div className="row gap-10" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="tiny bold" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>시작 주차</div>
              <select className="select" style={{ width: '100%' }} value={rangeStart} onChange={e => setRangeStart(e.target.value)}>
                {WEEKS.map(w => (
                  <option key={w.id} value={w.id}>{w.label} ({w.range})</option>
                ))}
              </select>
            </div>
            <span className="tiny subtle" style={{ marginTop: 16 }}>→</span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="tiny bold" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>종료 주차</div>
              <select className="select" style={{ width: '100%' }} value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}>
                {WEEKS.map(w => (
                  <option key={w.id} value={w.id}>{w.label} ({w.range})</option>
                ))}
              </select>
            </div>
          </div>
          {rangeWeekIds.length > 0 && (
            <div className="tiny" style={{ marginTop: 8, color: 'var(--accent)', fontWeight: 600 }}>
              ✓ {rangeLabel}에 동일하게 적용됩니다
            </div>
          )}
        </div>
      )}

      {/* 업무/부재 탭 — 읽기 전용에서는 숨김 */}
      {!readOnly && (
        <div style={{ marginTop: 12 }}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'work', label: '업무 (고객사 + 빌링)' },
              { value: 'note', label: '부재 (휴가/교육/대기)' },
            ]}
          />
        </div>
      )}

      {mode === 'work' ? (
        <>
          <div className="field" style={{ marginTop: 14 }}>
            <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>고객사</span>
              {clients.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--muted, #6B7684)', fontWeight: 400 }}>
                  {clients.length}개 선택됨
                </span>
              )}
            </div>
            {/* 선택된 고객사 칩 목록 */}
            {clients.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {clients.map((c, i) => {
                  const slackUrl = getSlackUrlForClientM(c);
                  return (
                    <span key={c} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px 3px 10px',
                      background: 'var(--info-weak, #EFF6FF)',
                      border: '1px solid var(--info, #3182F6)',
                      borderRadius: 9999, fontSize: 12, color: 'var(--ink, #191F28)',
                    }}>
                      {c}
                      {slackUrl && (
                        <a href={slackUrl} target="_blank" rel="noopener noreferrer"
                          title="Slack 채널 열기"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16, borderRadius: 3, background: '#4A154B',
                            textDecoration: 'none', flexShrink: 0 }}>
                          <SlackIcon size={10} />
                        </a>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => setClients(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, lineHeight: 1, color: 'var(--muted, #6B7684)',
                            fontSize: 14, display: 'flex', alignItems: 'center' }}
                          title="제거"
                        >×</button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
            {/* 고객사 추가 콤보박스 — 읽기 전용에서는 숨김 */}
            {!readOnly && (
              <ClientCombobox
                value=""
                placeholder={clients.length === 0 ? '채널명 또는 고객사명 검색…' : '+ 고객사 추가'}
                onChange={(val) => {
                  if (val) setClients(prev => [...prev, val]);
                }}
                excludes={clients}
              />
            )}
            {readOnly && clients.length === 0 && (
              <div className="tiny subtle">고객사 없음</div>
            )}
          </div>
          <div className="field">
            <div className="field-label">빌링 비율</div>
            {readOnly ? (
              <div className="tiny" style={{ fontWeight: 600, color: value === 0 ? 'var(--danger)' : 'var(--accent)' }}>
                {(value * 100).toFixed(0)}%
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </>
      ) : (
        <div className="field" style={{ marginTop: 14 }}>
          <div className="field-label">사유</div>
          {readOnly ? (
            <div className="tiny" style={{ fontWeight: 600 }}>{note || '—'}</div>
          ) : (
            <>
              <div className="row gap-6" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                {['휴가', '교육', '제안 준비', '대기', '출산휴가', '병가', '구정'].map(preset => (
                  <button key={preset} className="btn btn-sm" onClick={() => setNote(preset)} style={{ fontSize: 11 }}>{preset}</button>
                ))}
              </div>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="직접 입력 — 예: 휴가(~3/23), Snowflake 학습" />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// 고객사 검색형 콤보박스 — 파이프라인 채널 우선, 자유 입력 허용
function ClientCombobox({ value, onChange, placeholder, excludes = [] }) {
  const [query, setQuery] = useStateM(value || '');
  const [open, setOpen] = useStateM(false);
  const [dropRect, setDropRect] = useStateM(null);
  const wrapRef = useRefM(null);
  const wsUrl = localStorage.getItem('SLACK_WORKSPACE_URL') || 'https://bigxdata-official.slack.com';

  // note 필드에서 svName 추출: "[Slack] sv25-xxx" → "sv25-xxx"
  const extractSvName = (note) => {
    if (!note) return null;
    const m = note.match(/\[Slack\]\s*(.+)/i);
    return m ? m[1].trim() : null;
  };

  // 파이프라인 + 기존 수기 항목 병합
  // 수기 입력값이 파이프라인 client명 또는 channelName(svName)과 일치하면 채널 항목으로 처리
  const allOptions = (() => {
    const { UTIL, PIPELINE } = window.APP_DATA;
    // client명 → pipeline entry
    const byClient = {};
    // channelName(svName) → pipeline entry
    const byChannelName = {};
    PIPELINE.forEach(p => {
      if (p.client) byClient[p.client] = p;
      const sv = extractSvName(p.note);
      if (sv) byChannelName[sv.toLowerCase()] = p;
    });

    const opts = Object.values(byClient).map(p => {
      const svName = extractSvName(p.note);
      return {
        label: p.client,
        channelName: svName,
        slackChannelId: p.slackChannelId || null,
        slackUrl: p.slackChannelId ? wsUrl + '/archives/' + p.slackChannelId : null,
        fromPipeline: true,
      };
    });

    // 수기 입력값 중 파이프라인과 겹치지 않는 것만 추가
    // (client명 일치 OR channelName 일치 모두 제외 — 이미 파이프라인 항목으로 표시됨)
    const addedLabels = new Set(opts.map(o => o.label));
    Object.values(UTIL).forEach(wm => {
      Object.values(wm).forEach(c => {
        if (!c.client) return;
        // channelName 일치 → 해당 파이프라인 항목으로 매핑 (중복 추가 방지)
        const matchedByChannel = byChannelName[c.client.toLowerCase()];
        if (matchedByChannel && !addedLabels.has(matchedByChannel.client)) {
          const sv = extractSvName(matchedByChannel.note);
          opts.push({
            label: matchedByChannel.client,
            channelName: sv,
            slackChannelId: matchedByChannel.slackChannelId || null,
            slackUrl: matchedByChannel.slackChannelId ? wsUrl + '/archives/' + matchedByChannel.slackChannelId : null,
            fromPipeline: true,
          });
          addedLabels.add(matchedByChannel.client);
          return;
        }
        // 파이프라인 client명과도 일치하지 않으면 수기 항목으로 추가
        if (!addedLabels.has(c.client) && !byClient[c.client]) {
          opts.push({ label: c.client, channelName: null, slackChannelId: null, slackUrl: null, fromPipeline: false });
          addedLabels.add(c.client);
        }
      });
    });
    return opts;
  })();

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? allOptions.filter(o =>
        (o.channelName || '').toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q)
      )
    : allOptions
  ).filter(o => !excludes.includes(o.label));

  // 드롭다운 위치를 open 시 및 입력값 변경 시마다 측정
  useEffectM(() => {
    if (!open) return;
    const update = () => {
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setDropRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffectM(() => {
    setQuery(value || '');
  }, [value]);

  useEffectM(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (opt) => {
    onChange(opt.label);
    setQuery('');   // 선택 후 입력창 초기화 (칩 추가 방식)
    setOpen(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  // placeholder prop 반영
  const inputPlaceholder = placeholder || '채널명 또는 고객사명 검색…';

  // 검색어 또는 value와 일치하는 옵션 (칩 추가 모드에서 query로 매칭)
  const _matchStr = (value || query).trim().toLowerCase();
  const selectedOpt = allOptions.find(o => o.label.toLowerCase() === _matchStr) ||
    allOptions.find(o => o.channelName && o.channelName.toLowerCase() === _matchStr);

  // 실제 정의된 색상 토큰 사용 (--bg-elev 은 이 프로젝트에 미정의)
  const BG   = 'var(--canvas, #ffffff)';
  const BG_H = 'var(--canvas-alt, #F9FAFB)';
  const BG_S = 'var(--surface-2, #F2F4F6)';

  const showDropdown = open && dropRect && (filtered.length > 0 || (query.trim() && !allOptions.find(o => o.label === query.trim())));

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className="input"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={inputPlaceholder}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        {selectedOpt?.slackUrl && (
          <a href={selectedOpt.slackUrl} target="_blank" rel="noopener noreferrer"
            title="Slack 채널 열기"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 7, background: '#4A154B', color: 'white', textDecoration: 'none', fontSize: 14 }}>
            <SlackIcon />
          </a>
        )}
      </div>
      {showDropdown && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: dropRect.top,
          left: dropRect.left,
          width: dropRect.width,
          background: BG,
          border: '1px solid var(--border, #E5E8EB)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 99999,
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {filtered.slice(0, 40).map((opt, i) => (
            <div
              key={i}
              onMouseDown={() => select(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border, #E5E8EB)',
                background: opt.label === value ? 'var(--info-weak, #EFF6FF)' : BG,
              }}
              onMouseEnter={e => e.currentTarget.style.background = BG_H}
              onMouseLeave={e => e.currentTarget.style.background = opt.label === value ? 'var(--info-weak, #EFF6FF)' : BG}
            >
              <span style={{ flex: 1, overflow: 'hidden' }}>
                {opt.channelName ? (
                  <span>
                    <span style={{ fontWeight: 500 }}>{opt.channelName}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted, #6B7684)', marginLeft: 6 }}>{opt.label}</span>
                  </span>
                ) : (
                  <span>{opt.label}</span>
                )}
              </span>
            </div>
          ))}
          {/* 입력값이 기존 목록에 없고 excludes에도 없으면 직접 입력 항목 노출 */}
          {query.trim() && !allOptions.find(o => o.label === query.trim()) && !excludes.includes(query.trim()) && (
            <div
              onMouseDown={() => { onChange(query.trim()); setQuery(''); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                color: 'var(--muted, #6B7684)', borderTop: '1px solid var(--border, #E5E8EB)',
                background: BG,
              }}
              onMouseEnter={e => e.currentTarget.style.background = BG_H}
              onMouseLeave={e => e.currentTarget.style.background = BG}
            >
              <span style={{ fontSize: 11 }}>＋</span>
              <span>"{query.trim()}" 직접 입력</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function SlackIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

// ===== 신규 / 수정 파이프라인 모달 =====
function PipelineModal({ open, onClose, onSave, onDelete, initialProject }) {
  const { PROJECT_KINDS, PIPELINE_STAGES, SALES_PEOPLE } = window.APP_DATA;
  const isEdit = !!initialProject;
  const emptyForm = {
    priority: 99, client: '', kind: 'PJ', status: '예정', sales: '',
    preSales: '', start: '2026-06-01', end: '2026-08-31', mm: null,
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
