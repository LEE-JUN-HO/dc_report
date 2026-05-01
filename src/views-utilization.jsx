// 주간 가동률 표 — 실제 데이터 버전
const { useState: useStateU, useMemo: useMemoU } = React;

const ZERO_BILLING_WORK_COLOR = '#EF3226';
const ZERO_BILLING_WORK_BG = '#FEE2E2';
const ABSENCE_COLOR = '#D97706';
const ABSENCE_BG = '#FFFBEA';
const ABSENCE_STRIPE_COLOR = '#FFE501';
const UNASSIGNED_BG = '#F8FAFC';

function weekPeriodYear(week) { return week?.periodYear ?? week?.year; }
function weekPeriodMonth(week) { return week?.periodMonth ?? week?.month; }
function weekPeriodQuarter(week) { return week?.periodQuarter ?? week?.quarter; }
function weekPeriodHalf(week) { return week?.periodHalf ?? week?.half; }

function isZeroBillingWork(data) {
  return !!data?.client && data?.hasValue && Number(data.value) === 0;
}

function isAbsence(data) {
  return !!data?.note && !data?.client;
}

function isUnassigned(data) {
  return !data?.client && !data?.note && Number(data?.value || 0) === 0;
}

function utilizationCellBg(data) {
  if (isZeroBillingWork(data)) return ZERO_BILLING_WORK_BG;
  if (isAbsence(data)) {
    return `repeating-linear-gradient(135deg, ${ABSENCE_BG} 0 7px, ${ABSENCE_STRIPE_COLOR} 7px 10px, ${ABSENCE_BG} 10px 16px)`;
  }
  if (isUnassigned(data)) return UNASSIGNED_BG;
  return heatColor(data?.value);
}

function utilizationCellTextColor(data) {
  if (isZeroBillingWork(data)) return ZERO_BILLING_WORK_COLOR;
  if (isAbsence(data)) return '#713F12';
  if (isUnassigned(data)) return 'var(--text-subtle)';
  return heatTextColor(data?.value);
}

function utilizationCellShadow(data, isCurrent = false) {
  const shadows = [];
  if (isCurrent) shadows.push('inset 0 0 0 1px var(--accent)');
  if (isZeroBillingWork(data)) shadows.push(`inset 3px 0 0 ${ZERO_BILLING_WORK_COLOR}`);
  if (isAbsence(data)) shadows.push(`inset 0 0 0 1px ${ABSENCE_COLOR}55`);
  return shadows.length ? shadows.join(', ') : 'none';
}

function utilizationCellLabel(data, compact = false) {
  if (isZeroBillingWork(data)) return compact ? '0' : '0.0';
  if (data?.value > 0) return compact ? (data.value * 100).toFixed(0) : data.value.toFixed(1);
  if (isAbsence(data)) return '•';
  return '';
}

function UtilizationView({ onOverride, onSelectUser, dataVersion }) {
  const [layout, setLayout] = useStateU('table');
  const [teamFilter, setTeamFilter] = useStateU('all');
  const [statusFilter, setStatusFilter] = useStateU('active'); // active/all
  const [weekOffset, setWeekOffset] = useStateU(0);
  const [search, setSearch] = useStateU('');

  const { TEAMS, USERS, WEEKS, computeUtilization, currentWeekIdx, STATUSES, KPI_TARGET, isUserInUtilizationBase } = window.APP_DATA;

  const WINDOW_SIZE = 8;
  const curIdx = currentWeekIdx();
  const startIdx = Math.max(0, Math.min(WEEKS.length - WINDOW_SIZE, curIdx - 3 + weekOffset));
  const visibleWeeks = WEEKS.slice(startIdx, startIdx + WINDOW_SIZE);
  const currentWeek = WEEKS[curIdx];

  // ===== 계산 모수 기준 집계 =====
  const summaryStats = useMemoU(() => {
    const avgOf = (filterFn) => {
      const ws = WEEKS.filter(filterFn);
      if (ws.length === 0) return { avg: 0, overCount: 0, underCount: 0 };
      let sum = 0, n = 0, over = 0, under = 0;
      ws.forEach(w => {
        USERS.filter(u => isUserInUtilizationBase(u, w)).forEach(u => {
          const v = computeUtilization(u.id, w.id).value;
          sum += v; n++;
          if (ws.length === 1) {
            if (v > 1.0) over++;
            else if (v < 0.5) under++;
          }
        });
      });
      return { avg: sum / (n || 1), overCount: over, underCount: under };
    };
    const cm = weekPeriodMonth(currentWeek);
    const cy = weekPeriodYear(currentWeek);
    const cq = weekPeriodQuarter(currentWeek);
    const ch = weekPeriodHalf(currentWeek);
    const nm  = cm % 12 + 1;
    const nmY = nm === 1 ? cy + 1 : cy;
    const nnm  = nm % 12 + 1;
    const nnmY = nnm === 1 ? nmY + 1 : nmY;
    return {
      userCount: USERS.filter(u => isUserInUtilizationBase(u, currentWeek)).length,
      week:          avgOf(w => w.id === currentWeek.id),
      month:         avgOf(w => weekPeriodMonth(w) === cm && weekPeriodYear(w) === cy),
      nextMonth:     avgOf(w => weekPeriodMonth(w) === nm  && weekPeriodYear(w) === nmY),
      nextNextMonth: avgOf(w => weekPeriodMonth(w) === nnm && weekPeriodYear(w) === nnmY),
      quarter:       avgOf(w => weekPeriodQuarter(w) === cq && weekPeriodYear(w) === cy),
      half:          avgOf(w => weekPeriodHalf(w) === ch && weekPeriodYear(w) === cy),
      year:          avgOf(w => w.year === currentWeek.year),
      periodMeta:         { month: cm, year: cy, quarter: cq, half: ch },
      nextMonthMeta:     { month: nm,  year: nmY },
      nextNextMonthMeta: { month: nnm, year: nnmY },
    };
  }, [curIdx, dataVersion]);

  const visibleUsers = useMemoU(() => {
    return USERS.filter(u => {
      if (teamFilter !== 'all' && u.team !== teamFilter) return false;
      if (statusFilter === 'active' && u.status !== 'active') return false;
      if (search && !u.name.includes(search)) return false;
      return true;
    });
  }, [teamFilter, statusFilter, search, dataVersion]);

  const grouped = useMemoU(() => {
    const map = {};
    visibleUsers.forEach(u => {
      if (!map[u.team]) map[u.team] = [];
      map[u.team].push(u);
    });
    return TEAMS.filter(t => map[t.id]).map(t => ({ team: t, users: map[t.id] }));
  }, [visibleUsers, dataVersion]);

  return (
    <div className="col gap-16">
      {/* 전체 팀 (DC 제외) 가동률 KPI */}
      <SummaryBanner
        stats={summaryStats}
        currentWeek={currentWeek}
        kpiTarget={KPI_TARGET}
      />

      <div className="card" style={{ padding: '12px 18px' }}>
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          <Segmented
            value={layout}
            onChange={setLayout}
            options={[
              { value: 'table',   label: '📋 표' },
              { value: 'heatmap', label: '🔥 히트맵' },
              { value: 'gantt',   label: '📊 간트' },
            ]}
          />
          <div style={{ width: 1, height: 20, background: 'var(--border)' }}></div>
          <select className="select" style={{ width: 'auto' }} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            <option value="all">전체 팀</option>
            {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'active', label: '재직만' },
              { value: 'all',    label: '전체(퇴사·휴직 포함)' },
            ]}
          />
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-subtle)' }}>
              <Icon name="search" size={14} />
            </span>
            <input className="input" placeholder="이름" style={{ paddingLeft: 28, width: 120 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}></div>
          <div className="row gap-6">
            <button className="btn btn-sm" onClick={() => setWeekOffset(w => w - 1)}><Icon name="chevronL" size={13} /></button>
            <div className="small num" style={{ minWidth: 140, textAlign: 'center', color: 'var(--text-muted)' }}>
              {visibleWeeks[0].label}({visibleWeeks[0].range}) ~ {visibleWeeks[visibleWeeks.length - 1].label}
            </div>
            <button className="btn btn-sm" onClick={() => setWeekOffset(w => w + 1)}><Icon name="chevronR" size={13} /></button>
            <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>Today</button>
          </div>
        </div>
      </div>

      <div className="row gap-12" style={{ paddingLeft: 4 }}>
        <div className="heat-legend">
          <span>가동률</span>
          <span className="heat-legend-swatches">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
              <span key={v} className="heat-legend-swatch" style={{ background: heatColor(v) }} title={`${(v*100).toFixed(0)}%`}></span>
            ))}
          </span>
          <span className="tiny">20 → 100%</span>
        </div>
        <div className="heat-legend">
          <span style={{ width: 14, height: 12, background: ZERO_BILLING_WORK_BG, borderRadius: 2, display: 'inline-block', boxShadow: `inset 3px 0 0 ${ZERO_BILLING_WORK_COLOR}` }}></span>
          <span>업무 0%</span>
        </div>
        <div className="heat-legend">
          <span style={{ width: 14, height: 12, background: `repeating-linear-gradient(135deg, ${ABSENCE_BG} 0 5px, ${ABSENCE_STRIPE_COLOR} 5px 7px, ${ABSENCE_BG} 7px 12px)`, borderRadius: 2, display: 'inline-block', border: '1px solid var(--border)' }}></span>
          <span>부재</span>
        </div>
        <div className="heat-legend">
          <span style={{ width: 14, height: 12, background: UNASSIGNED_BG, borderRadius: 2, display: 'inline-block', border: '1px solid var(--border)' }}></span>
          <span>미배정</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="tiny subtle">총 {visibleUsers.length}명 표시 · 목표 85%</div>
      </div>

      {layout === 'table'   && <UtilTable grouped={grouped} weeks={visibleWeeks} onSelectUser={onSelectUser} onOverride={onOverride} />}
      {layout === 'heatmap' && <UtilHeatmap grouped={grouped} weeks={visibleWeeks} onSelectUser={onSelectUser} onOverride={onOverride} />}
      {layout === 'gantt'   && <UtilGantt grouped={grouped} weeks={visibleWeeks} onSelectUser={onSelectUser} />}
    </div>
  );
}

// ===== TABLE =====
function UtilTable({ grouped, weeks, onSelectUser, onOverride }) {
  const { computeUtilization, LEVEL_COLORS, isUserInUtilizationBase } = window.APP_DATA;
  const NAME_W = 150;
  const LVL_W  = 56;
  const AVG_W  = 60;

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ minWidth: NAME_W + LVL_W + AVG_W + weeks.length * 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px ${LVL_W}px ${AVG_W}px repeat(${weeks.length}, 1fr)`, position: 'sticky', top: 0, background: 'var(--bg-sunken)', zIndex: 2, borderBottom: '1px solid var(--border)' }}>
          <div className="tiny bold" style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>팀원</div>
          <div className="tiny bold" style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>등급</div>
          <div className="tiny bold" style={{ padding: '10px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>평균</div>
          {weeks.map(w => (
            <div key={w.id} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div className="tiny bold" style={{ color: 'var(--text-muted)' }}>{w.label}</div>
              <div className="tiny num" style={{ color: 'var(--text-subtle)' }}>{w.range}</div>
            </div>
          ))}
        </div>

        {grouped.map(({ team, users }) => (
          <div key={team.id}>
            <div style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px ${LVL_W}px ${AVG_W}px repeat(${weeks.length}, 1fr)`, background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)' }}>
              <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: team.color, borderRadius: 2 }}></span>
                <span className="bold small">{team.name}</span>
                <span className="tiny subtle">· {users.length}명</span>
              </div>
              <div></div>
              <div style={{ padding: '6px 8px', textAlign: 'center' }}>
                {(() => {
                  const all = [];
                  users.forEach(u => weeks.forEach(w => {
                    if (isUserInUtilizationBase(u, w)) all.push(computeUtilization(u.id, w.id).value);
                  }));
                  const avg = all.reduce((a,b)=>a+b,0) / (all.length || 1);
                  return <span className="tiny num bold" style={{ color: avg > 1 ? 'var(--danger)' : avg < 0.5 ? 'var(--warn)' : 'var(--success)' }}>{(avg*100).toFixed(0)}%</span>;
                })()}
              </div>
              {weeks.map(w => {
                const baseUsers = users.filter(u => isUserInUtilizationBase(u, w));
                const teamAvg = baseUsers.reduce((s, u) => s + computeUtilization(u.id, w.id).value, 0) / (baseUsers.length || 1);
                return (
                  <div key={w.id} style={{ padding: '6px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                    <span className="tiny num" style={{ fontWeight: 600, color: teamAvg > 1 ? 'var(--danger)' : teamAvg > 0.8 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {(teamAvg*100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {users.map(u => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px ${LVL_W}px ${AVG_W}px repeat(${weeks.length}, 1fr)`, borderTop: '1px solid var(--border)', opacity: u.status === 'active' ? 1 : 0.55 }}>
                <div style={{ padding: '4px 14px 4px 22px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onSelectUser(u.id)}>
                  <Avatar name={u.name} userId={u.id} size="sm" />
                  <span className="small" style={{ fontWeight: 500 }}>{u.name}</span>
                  {u.isManager && <span className="badge" style={{ fontSize: 9, padding: '1px 5px' }}>관리자</span>}
                  {u.status !== 'active' && <span className="badge tiny" style={{ background: 'var(--bg-sunken)', fontSize: 9 }}>{window.APP_DATA.STATUSES[u.status].label}</span>}
                </div>
                <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                  <span className="tiny" style={{ color: LEVEL_COLORS[u.level] || 'var(--text-subtle)', fontWeight: 600 }}>{u.level}</span>
                </div>
                <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(() => {
                    const vals = weeks.map(w => computeUtilization(u.id, w.id).value);
                    const avg = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
                    return <span className="tiny num bold" style={{ color: avg > 1 ? 'var(--danger)' : avg < 0.4 ? 'var(--warn)' : 'var(--text)' }}>{(avg*100).toFixed(0)}%</span>;
                  })()}
                </div>
                {weeks.map(w => {
                  const u_ = computeUtilization(u.id, w.id);
                  const bg = utilizationCellBg(u_);
                  return <UtilCell key={w.id} data={u_} bg={bg} isCurrent={w.num - 1 === window.APP_DATA.currentWeekIdx()} onClick={() => onOverride(u.id, w.id, u_)} />;
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function UtilCell({ data, bg, isCurrent, onClick }) {
  const [hover, setHover] = useStateU(false);
  const hasNote = !!data.note;
  return (
    <div
      className={`util-cell ${hasNote ? 'manual' : ''}`}
      style={{
        background: bg,
        color: utilizationCellTextColor(data),
        borderLeft: '1px solid var(--border)',
        borderRight: 'none',
        borderBottom: 'none',
        boxShadow: utilizationCellShadow(data, isCurrent),
        position: 'relative',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="num">{utilizationCellLabel(data)}</span>
      {hover && (data.client || data.note) && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'white', padding: '8px 10px', borderRadius: 6,
          fontSize: 11, whiteSpace: 'nowrap', zIndex: 100, boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none', marginTop: 4,
        }}>
          {data.client && <div>{data.client} · {data.value}</div>}
          {data.note && <div style={{ opacity: 0.7 }}>📌 {data.note}</div>}
        </div>
      )}
    </div>
  );
}

// ===== HEATMAP =====
function UtilHeatmap({ grouped, weeks, onSelectUser, onOverride }) {
  const { computeUtilization } = window.APP_DATA;
  const NAME_W = 180;
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ minWidth: NAME_W + weeks.length * 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px repeat(${weeks.length}, 1fr)`, position: 'sticky', top: 0, background: 'var(--bg-elev)', zIndex: 2, borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
          <div className="tiny bold" style={{ padding: '4px 14px', color: 'var(--text-muted)' }}>팀원 × 주차</div>
          {weeks.map(w => (
            <div key={w.id} style={{ textAlign: 'center' }}>
              <div className="tiny bold" style={{ color: 'var(--text-muted)' }}>{w.label}</div>
              <div className="tiny num" style={{ color: 'var(--text-subtle)', fontSize: 9 }}>{w.range}</div>
            </div>
          ))}
        </div>
        {grouped.map(({ team, users }) => (
          <div key={team.id} style={{ borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-sunken)' }}>
              <span style={{ width: 3, height: 12, background: team.color, borderRadius: 2 }}></span>
              <span className="bold tiny">{team.name} ({users.length})</span>
            </div>
            {users.map(u => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px repeat(${weeks.length}, 1fr)`, padding: '3px 0', alignItems: 'center', opacity: u.status === 'active' ? 1 : 0.5 }}>
                <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onSelectUser(u.id)}>
                  <Avatar name={u.name} userId={u.id} size="sm" />
                  <span className="small" style={{ fontWeight: 500 }}>{u.name}</span>
                  <span className="tiny subtle">{u.level}</span>
                </div>
                {weeks.map(w => {
                  const d = computeUtilization(u.id, w.id);
                  return (
                    <div key={w.id} onClick={() => onOverride(u.id, w.id, d)} style={{
                      height: 30, margin: '0 2px', borderRadius: 5,
                      background: utilizationCellBg(d),
                      display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
                      color: utilizationCellTextColor(d), cursor: 'pointer', position: 'relative',
                      boxShadow: utilizationCellShadow(d),
                    }}>
                      {utilizationCellLabel(d, true)}
                      {isAbsence(d) && <span style={{ position: 'absolute', top: 2, right: 3, width: 4, height: 4, background: ABSENCE_COLOR, borderRadius: '50%' }}></span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== GANTT: 프로젝트 단위가 아닌 고객사 단위 블록 표시 =====
function UtilGantt({ grouped, weeks, onSelectUser }) {
  const { computeUtilization } = window.APP_DATA;
  const NAME_W = 150;

  // 각 유저마다 연속된 같은 client 블록 추출
  const getBlocks = (userId) => {
    const blocks = [];
    let cur = null;
    weeks.forEach((w, idx) => {
      const d = computeUtilization(userId, w.id);
      const key = d.client || (d.note ? `__${d.note}` : '__empty');
      if (cur && cur.key === key) {
        cur.end = idx;
        cur.data.push(d);
      } else {
        if (cur) blocks.push(cur);
        cur = { key, start: idx, end: idx, client: d.client, note: d.note, data: [d] };
      }
    });
    if (cur) blocks.push(cur);
    return blocks;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ minWidth: NAME_W + weeks.length * 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px repeat(${weeks.length}, 1fr)`, background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }}>
          <div className="tiny bold" style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>팀원 / 주</div>
          {weeks.map(w => (
            <div key={w.id} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div className="tiny bold" style={{ color: 'var(--text-muted)' }}>{w.label}</div>
              <div className="tiny num" style={{ color: 'var(--text-subtle)' }}>{w.range}</div>
            </div>
          ))}
        </div>
        {grouped.map(({ team, users }) => (
          <div key={team.id}>
            <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)' }}>
              <span style={{ width: 3, height: 12, background: team.color, borderRadius: 2 }}></span>
              <span className="bold tiny">{team.name}</span>
            </div>
            {users.map(u => {
              const blocks = getBlocks(u.id);
              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: `${NAME_W}px 1fr`, borderTop: '1px solid var(--border)', height: 36 }}>
                  <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onSelectUser(u.id)}>
                    <Avatar name={u.name} userId={u.id} size="sm" />
                    <span className="small" style={{ fontWeight: 500 }}>{u.name}</span>
                  </div>
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
                    {weeks.map(w => <div key={w.id} style={{ borderLeft: '1px solid var(--border)' }}></div>)}
                    {blocks.filter(b => b.client).map((b, i) => {
                      const avgVal = b.data.reduce((s, d) => s + d.value, 0) / b.data.length;
                      const bg = team.color;
                      const span = b.end - b.start + 1;
                      return (
                        <div
                          key={i}
                          className="gantt-bar"
                          title={`${b.client} · ${b.data.length}주 · 평균 ${(avgVal*100).toFixed(0)}%`}
                          style={{
                            position: 'absolute',
                            left: `calc(${b.start} * (100% / ${weeks.length}) + 2px)`,
                            width: `calc(${span} * (100% / ${weeks.length}) - 4px)`,
                            top: 8, height: 20,
                            background: bg, opacity: 0.5 + avgVal * 0.5,
                          }}
                        >{b.client} · {avgVal.toFixed(1)}</div>
                      );
                    })}
                    {blocks.filter(b => !b.client && b.note).map((b, i) => {
                      const span = b.end - b.start + 1;
                      return (
                        <div
                          key={'n' + i}
                          style={{
                            position: 'absolute',
                            left: `calc(${b.start} * (100% / ${weeks.length}) + 2px)`,
                            width: `calc(${span} * (100% / ${weeks.length}) - 4px)`,
                            top: 8, height: 20,
                            background: 'repeating-linear-gradient(45deg, var(--warn-weak) 0 5px, transparent 5px 10px)',
                            border: '1px dashed var(--warn)',
                            borderRadius: 3,
                            fontSize: 9, color: 'var(--warn)', padding: '0 6px',
                            display: 'flex', alignItems: 'center', fontWeight: 600,
                          }}
                        >{b.note}</div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 상단 요약 배너 (DC 제외 전체팀) =====
function SummaryBanner({ stats, currentWeek, kpiTarget }) {
  const { nextMonthMeta: nm, nextNextMonthMeta: nnm } = stats;
  const period = stats.periodMeta || {
    year: weekPeriodYear(currentWeek),
    month: weekPeriodMonth(currentWeek),
    quarter: weekPeriodQuarter(currentWeek),
    half: weekPeriodHalf(currentWeek),
  };
  const cards = [
    { key: 'week',          label: '이번 주',   sub: `${currentWeek.label} (${currentWeek.range})`,  value: stats.week.avg,          extra: { over: stats.week.overCount, under: stats.week.underCount } },
    { key: 'month',         label: '이번 달',   sub: `${period.year}년 ${period.month}월`, value: stats.month.avg },
    { key: 'nextMonth',     label: '다음달',    sub: `${nm.year}년 ${nm.month}월`,                   value: stats.nextMonth.avg,     future: true },
    { key: 'nextNextMonth', label: '다다음달',  sub: `${nnm.year}년 ${nnm.month}월`,                 value: stats.nextNextMonth.avg, future: true },
    { key: 'quarter',       label: '분기',      sub: `Q${period.quarter}`,                           value: stats.quarter.avg },
    { key: 'half',          label: '반기',      sub: `${period.half}`,                               value: stats.half.avg },
    { key: 'year',          label: '연간',      sub: `${currentWeek.year}`,                          value: stats.year.avg },
  ];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <span className="tiny bold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>전체 팀 가동률</span>
        <span className="tiny subtle">계산 모수 {stats.userCount}명 · 목표 {(kpiTarget * 100).toFixed(0)}%</span>
        <div style={{ flex: 1 }}></div>
        {(stats.week.overCount > 0 || stats.week.underCount > 0) && (
          <>
            {stats.week.overCount > 0 && (
              <span className="badge" style={{ background: 'var(--danger-weak)', color: 'var(--danger)' }}>
                과부하 {stats.week.overCount}명
              </span>
            )}
            {stats.week.underCount > 0 && (
              <span className="badge" style={{ background: 'var(--warn-weak)', color: 'var(--warn)' }}>
                저활용 {stats.week.underCount}명
              </span>
            )}
          </>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cards.map((c, i) => (
          <SummaryCard key={c.key} card={c} target={kpiTarget} isFirst={i === 0} showBorder={i < cards.length - 1} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ card, target, isFirst, showBorder }) {
  const v = card.value;
  const pct = (v * 100).toFixed(1);
  const color = v > 1.0 ? 'var(--danger)' : v >= target ? 'var(--success)' : v >= 0.7 ? 'var(--accent)' : 'var(--warn)';
  const diff = v - target;
  const isFuture = !!card.future;
  return (
    <div style={{
      padding: '14px 18px',
      borderRight: showBorder ? '1px solid var(--border)' : 'none',
      background: isFirst ? 'var(--bg-sunken)' : isFuture ? 'color-mix(in srgb, var(--bg-elev) 85%, var(--accent-weak))' : 'var(--bg-elev)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tiny bold" style={{ color: isFuture ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</span>
        <span className="tiny subtle">· {card.sub}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
        <span className="num bold" style={{ fontSize: 22, color: isFuture ? 'var(--text-muted)' : color, letterSpacing: '-0.01em', opacity: isFuture ? 0.75 : 1 }}>{pct}</span>
        <span className="tiny subtle">%</span>
        <span className="tiny" style={{ marginLeft: 'auto', color: isFuture ? 'var(--text-subtle)' : diff >= 0 ? 'var(--success)' : 'var(--text-subtle)' }}>
          {isFuture ? '예정' : (diff >= 0 ? '+' : '') + (diff * 100).toFixed(1) + 'p'}
        </span>
      </div>
      {/* 막대 — 목표선 85%를 기준 */}
      <div style={{ marginTop: 6, height: 3, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: Math.min(v, 1.2) / 1.2 * 100 + '%', height: '100%', background: isFuture ? 'var(--accent-weak)' : color, borderRadius: 2 }}></div>
        <div style={{ position: 'absolute', left: (target / 1.2 * 100) + '%', top: -1, width: 1, height: 5, background: 'var(--text-muted)', opacity: 0.5 }}></div>
      </div>
    </div>
  );
}

Object.assign(window, { UtilizationView });
