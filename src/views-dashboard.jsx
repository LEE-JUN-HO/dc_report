// 대시보드 — 실데이터 버전
const { useMemo: useMemoDash } = React;

function dashboardWeekPeriodYear(week) { return week?.periodYear ?? week?.year; }
function dashboardWeekPeriodMonth(week) { return week?.periodMonth ?? week?.month; }
function dashboardWeekPeriodQuarter(week) { return week?.periodQuarter ?? week?.quarter; }
function dashboardWeekPeriodHalf(week) { return week?.periodHalf ?? week?.half; }

function DashboardView({ onNavigate, dataVersion }) {
  const { USERS, TEAMS, WEEKS, PIPELINE, computeUtilization, currentWeekIdx, KPI_TARGET, isUserInUtilizationBase } = window.APP_DATA;
  const curIdx = currentWeekIdx();
  const currentWeek = WEEKS[curIdx];
  const periodYear = dashboardWeekPeriodYear(currentWeek);
  const periodMonth = dashboardWeekPeriodMonth(currentWeek);
  const periodQuarter = dashboardWeekPeriodQuarter(currentWeek);
  const periodHalf = dashboardWeekPeriodHalf(currentWeek);
  const activeUsers = USERS.filter(u => u.status === 'active');
  const currentBaseUsers = USERS.filter(u => isUserInUtilizationBase(u, currentWeek));

  // 이번 주 전사 평균 (계산 모수 기준)
  const weekAvg = useMemoDash(() => {
    const vals = currentBaseUsers.map(u => computeUtilization(u.id, currentWeek.id).value);
    return vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
  }, [dataVersion]);
  const lastWeekAvg = useMemoDash(() => {
    const lw = WEEKS[curIdx - 1];
    if (!lw) return 0;
    const vals = USERS.filter(u => isUserInUtilizationBase(u, lw)).map(u => computeUtilization(u.id, lw.id).value);
    return vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
  }, [dataVersion]);

  const periodAvgs = useMemoDash(() => {
    const compute = (filter) => {
      const ws = WEEKS.filter(filter);
      if (ws.length === 0) return 0;
      let sum = 0, n = 0;
      ws.forEach(w => {
        USERS.filter(u => isUserInUtilizationBase(u, w)).forEach(u => {
          sum += computeUtilization(u.id, w.id).value;
          n++;
        });
      });
      return sum / (n || 1);
    };
    return {
      month:   compute(w => dashboardWeekPeriodMonth(w) === periodMonth && dashboardWeekPeriodYear(w) === periodYear),
      quarter: compute(w => dashboardWeekPeriodQuarter(w) === periodQuarter && dashboardWeekPeriodYear(w) === periodYear),
      half:    compute(w => dashboardWeekPeriodHalf(w) === periodHalf && dashboardWeekPeriodYear(w) === periodYear),
      year:    compute(() => true),
    };
  }, [dataVersion]);

  const teamAvgs = useMemoDash(() => {
    return TEAMS.map(t => {
      const us = USERS.filter(u => u.team === t.id && isUserInUtilizationBase(u, currentWeek));
      const vals = us.map(u => computeUtilization(u.id, currentWeek.id).value);
      const avg = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
      return { team: t, avg, count: us.length };
    }).filter(x => x.count > 0).sort((a, b) => b.avg - a.avg);
  }, [dataVersion]);

  // 지난 12주 + 향후 8주 트렌드
  const trend = useMemoDash(() => {
    const slice = WEEKS.slice(Math.max(0, curIdx - 11), Math.min(WEEKS.length, curIdx + 9));
    const raw = slice.map((w) => {
      const baseUsers = USERS.filter(u => isUserInUtilizationBase(u, w));
      const entries = baseUsers.map(u => ({ user: u, d: computeUtilization(u.id, w.id) }));
      const numerator = entries.reduce((s, e) => s + e.d.value, 0);
      const denominator = baseUsers.length;
      const avg = numerator / (denominator || 1);
      const isFuture = w.num - 1 > curIdx;
      const overCount  = entries.filter(e => e.d.value > 1.0).length;
      const freeCount  = entries.filter(e => e.d.hasValue && Number(e.d.value) === 0 && !(e.d.note && !e.d.client)).length;
      const leaveCount = entries.filter(e => !!e.d.note && !e.d.client).length;
      const waitCount  = entries.filter(e => e.d.empty === true).length;
      const underCount = entries.filter(e => {
        const d = e.d;
        const isFreeEntry = d.hasValue && Number(d.value) === 0 && !(d.note && !d.client);
        const isLeave = !!d.note && !d.client;
        return d.value < 0.5 && !isFreeEntry && !isLeave;
      }).length;
      return {
        label: w.label, range: w.range, value: avg,
        numerator, denominator,
        count: baseUsers.length, overCount, underCount, freeCount, leaveCount, waitCount,
        isCurrent: w.num - 1 === curIdx, isFuture,
      };
    });
    return raw.map((d, i) => ({ ...d, delta: i > 0 ? d.value - raw[i - 1].value : null }));
  }, [dataVersion]);

  const alerts = useMemoDash(() => {
    const free = [], under = [], onLeave = [];
    currentBaseUsers.forEach(u => {
      const d = computeUtilization(u.id, currentWeek.id);
      const isLeave = !!d.note && !d.client;
      const isFree = d.hasValue && Number(d.value) === 0 && !isLeave;
      if (isFree) free.push({ user: u, value: d.value, client: d.client, note: d.note });
      else if (isLeave) onLeave.push({ user: u, note: d.note });
      else if (d.value < 0.5) under.push({ user: u, value: d.value });
    });
    return { free, under, onLeave };
  }, [dataVersion]);

  const pipelineStats = useMemoDash(() => {
    const cnt = { '완료': 0, '확정': 0, '예정': 0 };
    const mm  = { '완료': 0, '확정': 0, '예정': 0 };
    let totalMm = 0;
    PIPELINE.forEach(p => {
      cnt[p.status]++;
      const effort = p.mm || 0;
      mm[p.status] += effort;
      totalMm += effort;
    });
    return { cnt, mm, total: PIPELINE.length, totalMm };
  }, [dataVersion]);

  const delta = weekAvg - lastWeekAvg;
  const formatMm = (value) => Number.isInteger(value) ? value.toLocaleString('ko-KR') : value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  const helpTexts = {
    weekAvg: `${currentWeek.label} 기준 계산 모수 대상자의 주간 가동률 평균입니다. 계산 모수는 재직자 중 입사일 이후인 사람만 포함하고, 4월부터 허순구 본부장 및 DX팀 강승일/김서연은 제외합니다. 목표는 85%이며 전주 동일 기준 평균과 비교합니다.`,
    monthAvg: `${periodMonth}월에 속한 주차별 계산 모수 대상자의 가동률을 모두 평균한 값입니다. 월 구분은 업무주 종료일(금요일)을 기준으로 합니다. 아래 Q/H 값도 같은 방식으로 분기와 반기 범위를 넓혀 계산합니다.`,
    headcount: `재직 / 전체는 사용자 데이터에서 status가 active인 인원과 전체 등록 인원을 비교합니다. 팀 수, 퇴사, 휴직 인원은 사용자 데이터의 현재 상태값 기준입니다.`,
    pipeline: `영업 파이프라인에 등록된 전체 건수와 예상 공수 합계입니다. 예상 공수는 각 건의 MM 값을 합산하며, 확정/예정/완료 건수는 진행상태 기준입니다.`,
    free: `${currentWeek.label} 계산 모수 대상자 중 해당 주차 빌링 비율이 명시적으로 0으로 입력된 인원입니다. 휴가/교육 등 부재 사유만 있는 인원은 부재로 분류합니다.`,
    under: `${currentWeek.label} 계산 모수 대상자 중 휴가/교육 등 부재 사유가 없고, 무상투입도 아니며, 가동률이 50% 미만인 인원입니다.`,
    leave: `${currentWeek.label} 계산 모수 대상자 중 프로젝트 고객사는 없고 휴가/교육 등 부재 사유가 입력된 인원입니다.`,
  };

  return (
    <div className="col gap-16">
      <div className="kpi-grid">
        <KpiCard
          label="이번 주 전사 가동률"
          help={helpTexts.weekAvg}
          value={`${(weekAvg * 100).toFixed(1)}`} unit="%"
          delta={delta} deltaLabel="vs 지난 주"
          sparkData={trend.slice(0, 13).map(t => t.value)}
          targetHint={weekAvg < KPI_TARGET ? `목표 85% · ${((KPI_TARGET - weekAvg) * currentBaseUsers.length).toFixed(1)} FTE 미달` : '목표 달성 ✓'}
        />
        <KpiCard
          label={`${periodMonth}월 평균`}
          help={helpTexts.monthAvg}
          value={`${(periodAvgs.month * 100).toFixed(1)}`} unit="%"
          sub={`Q${periodQuarter} ${(periodAvgs.quarter * 100).toFixed(1)}% · ${periodHalf} ${(periodAvgs.half * 100).toFixed(1)}%`}
        />
        <KpiCard
          label="재직 / 전체"
          help={helpTexts.headcount}
          value={activeUsers.length} unit={`명 / ${USERS.length}`}
          sub={`${TEAMS.length}개 팀 · 퇴사 ${USERS.filter(u=>u.status==='resigned').length} · 휴직 ${USERS.filter(u=>u.status==='leave').length}`}
        />
        <KpiCard
          label="파이프라인"
          help={helpTexts.pipeline}
          value={pipelineStats.total} unit="건"
          sub={`예상 공수 ${formatMm(pipelineStats.totalMm)} M/M · 확정 ${pipelineStats.cnt['확정']} · 예정 ${pipelineStats.cnt['예정']} · 완료 ${pipelineStats.cnt['완료']}`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
        <AlertCard
          title="무상투입"
          iconBg="var(--accent-weak)" iconColor="var(--accent)"
          help={helpTexts.free}
          count={alerts.free.length} subtitle="빌링 0%"
          items={alerts.free.map(a => ({ name: a.user.name, meta: a.client || a.note || '0%', color: 'var(--accent)', userId: a.user.id }))}
          metaWrap={true}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <AlertCard
          title="저활용"
          iconBg="var(--warn-weak)" iconColor="var(--warn)"
          help={helpTexts.under}
          count={alerts.under.length} subtitle="50% 미만"
          items={alerts.under.map(a => ({ name: a.user.name, meta: `${(a.value*100).toFixed(0)}%`, color: 'var(--warn)', userId: a.user.id }))}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <AlertCard
          title="부재"
          iconBg="var(--bg-sunken)" iconColor="var(--text-muted)"
          help={helpTexts.leave}
          count={alerts.onLeave.length} subtitle="휴가·교육 등"
          items={alerts.onLeave.map(a => ({ name: a.user.name, meta: a.note, color: 'var(--text-muted)', userId: a.user.id }))}
          metaWrap={true}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <NoticeCard />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'stretch' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">가동률 트렌드</div>
              <div className="card-sub">지난 12주 실적 + 향후 8주 계획</div>
            </div>
            <div style={{ flex: 1 }}></div>
            <span className="badge"><span className="badge-dot" style={{ background: '#3182F6' }}></span>실적</span>
            <span className="badge">
              <svg width="14" height="6" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                <line x1="0" y1="3" x2="14" y2="3" stroke="#8B95A1" strokeWidth="2" strokeDasharray="3 2" />
              </svg>
              계획
            </span>
          </div>
          <div style={{ padding: '18px 18px 14px', flex: 1, minHeight: 300, display: 'flex' }}>
            <TrendChart data={trend} height={300} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">팀별 이번 주</div>
              <div className="card-sub">{currentWeek.label} · {currentWeek.range}</div>
            </div>
          </div>
          <div style={{ padding: '10px 18px 14px' }}>
            {teamAvgs.map(({ team, avg, count }) => (
              <div key={team.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => onNavigate('team', team.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 3, height: 12, background: team.color, borderRadius: 2 }}></span>
                  <span className="small bold" style={{ flex: 1 }}>{team.name}</span>
                  <span className="tiny subtle">{count}명</span>
                  <span className="small num bold" style={{ color: avg > 1 ? 'var(--danger)' : avg < 0.5 ? 'var(--warn)' : avg >= 0.85 ? 'var(--success)' : 'var(--text)' }}>
                    {(avg * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: Math.min(avg * 100, 100) + '%', height: '100%', background: team.color, borderRadius: 2 }}></div>
                  <div style={{ position: 'absolute', left: '85%', top: -1, width: 1, height: 6, background: 'var(--text-muted)', opacity: 0.6 }} title="목표 85%"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">임박한 프로젝트 (향후 8주 내 시작/진행)</div>
            <div className="card-sub">파이프라인에서 확정·예정인 건</div>
          </div>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('pipeline')}>
            전체 <Icon name="chevronR" size={12} />
          </button>
        </div>
        <UpcomingProjects onClick={(id) => onNavigate('project', id)} />
      </div>
    </div>
  );
}

function NoticeCard() {
  const STORAGE_KEY = 'dashboard_notice_text';
  const [text, setText] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const taRef = React.useRef(null);

  React.useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY) || '';
    setText(v);
  }, []);

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
    setSaved(false);
    setTimeout(() => taRef.current && taRef.current.focus(), 0);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, draft);
    setText(draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft(text);
    setEditing(false);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 18px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small bold">공지 · 메모</div>
          <div className="tiny subtle">{saved ? '✓ 저장됨' : '팀 공유 메모'}</div>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--canvas)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
          >
            <Icon name="edit" size={12} /> 편집
          </button>
        )}
      </div>
      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* 본문 */}
      {editing ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px 12px', gap: 8 }}>
          <textarea
            ref={taRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="공지사항, 팀 메모 등을 입력하세요..."
            style={{
              flex: 1,
              minHeight: 120,
              resize: 'none',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 14,
              lineHeight: 1.7,
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--text)',
              background: 'var(--bg-sunken)',
              boxSizing: 'border-box',
              width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={handleCancel}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
              취소
            </button>
            <button onClick={handleSave}
              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: 'var(--blue-500)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              저장
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '10px 18px 14px', overflowY: 'auto' }}>
          {text ? (
            <div style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{text}</div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 4 }}>편집 버튼을 눌러 공지나 메모를 입력하세요.</div>
          )}
        </div>
      )}
    </div>
  );
}

function UpcomingProjects({ onClick }) {
  const { PIPELINE, TODAY } = window.APP_DATA;
  const today = TODAY.getTime();
  const upcoming = PIPELINE
    .filter(p => p.status !== '완료')
    .filter(p => {
      if (!p.start) return false;
      const s = new Date(p.start).getTime();
      return s >= today - 14*86400000 && s <= today + 60*86400000;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  if (upcoming.length === 0) return <div className="muted small" style={{ padding: 20 }}>임박한 프로젝트 없음</div>;
  return (
    <table className="data-table">
      <thead><tr><th>고객사</th><th>구분</th><th>상태</th><th>Sales</th><th>시작일</th><th>MM</th><th>진행상세</th></tr></thead>
      <tbody>
        {upcoming.slice(0, 6).map(p => (
          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onClick(p.id)}>
            <td><span className="bold small">{p.client}</span></td>
            <td><span className="badge">{p.kind}</span></td>
            <td><StatusPill status={p.status} /></td>
            <td className="small">{p.sales}</td>
            <td className="small num subtle">{p.start?.slice(5)}</td>
            <td className="small num bold">{p.mm ?? '—'}</td>
            <td className="small muted ellipsis" style={{ maxWidth: 320 }}>{p.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KpiCard({ label, value, unit, delta, deltaLabel, sparkData, sub, targetHint, help }) {
  const trend = delta != null ? (delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'flat') : null;
  return (
    <div className="kpi" style={{ overflow: 'visible' }}>
      <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{label}</span>
        <HelpTip text={help} />
      </div>
      <div className="kpi-value num">
        {value}<span className="kpi-value-sub">{unit}</span>
      </div>
      {delta != null && (
        <div className={`kpi-delta ${trend}`}>
          <Icon name={trend === 'up' ? 'arrowUp' : trend === 'down' ? 'arrowDown' : 'check'} size={11} />
          {Math.abs(delta * 100).toFixed(1)}%p {deltaLabel}
        </div>
      )}
      {targetHint && <div className="kpi-delta flat" style={{ color: 'var(--text-subtle)' }}>{targetHint}</div>}
      {sub && <div className="kpi-delta flat" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sub}</div>}
      {sparkData && <div className="kpi-spark"><Sparkline data={sparkData} w={80} h={26} /></div>}
    </div>
  );
}

function AlertCard({ title, iconBg, iconColor, count, subtitle, items, onItemClick, help, metaWrap = false }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="alert" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {title} <HelpTip text={help} />
          </div>
          <div className="tiny subtle">{subtitle}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: iconColor, lineHeight: 1, flexShrink: 0 }}>{count}</div>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* 명단 — 4명까지 표시, 초과 시 세로 스크롤 */}
      <div style={{ overflowY: 'auto', maxHeight: metaWrap ? 228 : 212, padding: 0 }}>
        {items.length === 0 ? (
          <div className="tiny subtle" style={{ padding: '8px 18px' }}>해당 없음 ✓</div>
        ) : items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '7px 18px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              display: 'flex',
              alignItems: metaWrap ? 'flex-start' : 'center',
              gap: 10,
              cursor: 'pointer',
            }}
            onClick={() => onItemClick(item)}
          >
            <div style={{ flexShrink: 0, paddingTop: metaWrap ? 1 : 0 }}>
              <Avatar name={item.name} userId={item.userId} size="sm" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 500, lineHeight: 1.4 }}>{item.name}</div>
              {metaWrap ? (
                <div className="tiny" style={{ color: item.color, fontWeight: 600, marginTop: 2, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                  {item.meta}
                </div>
              ) : (
                <div className="tiny" style={{ color: item.color, fontWeight: 700, marginTop: 1 }}>
                  {item.meta}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpTip({ text }) {
  if (!text) return null;
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef(null);

  const show = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left + r.width / 2 });
    }
    setVisible(true);
  };
  const hide = () => setVisible(false);

  return (
    <span ref={ref} className="help-tip" tabIndex="0" aria-label={text}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      ?
      {visible && (
        <span role="tooltip" style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          transform: 'translateX(-50%)',
          zIndex: 9999,
          maxWidth: 280,
          padding: '10px 14px',
          borderRadius: 8,
          background: '#191F28',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.6,
          whiteSpace: 'normal',
          textAlign: 'left',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function StatusPill({ status }) {
  const { PIPELINE_STAGES } = window.APP_DATA;
  const s = PIPELINE_STAGES.find(x => x.id === status);
  if (!s) return <span className="badge">{status}</span>;
  return <span className="stage-pill" style={{ background: s.color + '22', color: s.color }}>
    <span className="badge-dot" style={{ background: s.color }}></span>{status}
  </span>;
}

function TrendChart({ data, height = 300 }) {
  const [ttIdx, setTtIdx] = React.useState(null);
  const W = 720, H = height, PAD = 30;
  const maxY = 1.1;
  const y = v => H - PAD - (v / maxY) * (H - PAD * 2);
  const x = i => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const realPts   = data.map((d, i) => ({ ...d, _i: i })).filter(d => !d.isFuture || d.isCurrent);
  const futurePts = data.map((d, i) => ({ ...d, _i: i })).filter(d => d.isFuture  || d.isCurrent);
  const toPts = arr => arr.map(d => `${x(d._i)},${y(d.value)}`).join(' ');

  const ttd  = ttIdx != null ? data[ttIdx] : null;
  const ttCX = ttIdx != null ? x(ttIdx) : 0;
  const ttCY = ttIdx != null ? y(data[ttIdx].value) : 0;
  const TT_W = 204;

  const ttDetail = ttd ? (() => {
    const detailRows = [
      ttd.overCount  > 0 ? { label: '과부하 (100%↑)', value: `${ttd.overCount}명`,  color: '#F04452' } : null,
      ttd.underCount > 0 ? { label: '저활용 (50%↓)',  value: `${ttd.underCount}명`, color: '#F5A623' } : null,
      ttd.freeCount  > 0 ? { label: '무상투입',        value: `${ttd.freeCount}명`,  color: '#3B82F6' } : null,
      ttd.leaveCount > 0 ? { label: '부재',            value: `${ttd.leaveCount}명`, color: '#A78BFA' } : null,
      ttd.waitCount  > 0 ? { label: '대기 (미입력)',   value: `${ttd.waitCount}명`,  color: '#6B7684' } : null,
    ].filter(Boolean);
    const hasDelta = ttd.delta != null;
    const N = detailRows.length;
    const TT_H = 10 + 14 + 6 + 18 + (hasDelta ? 16 : 0) + 4 + 16 + 16 + (N > 0 ? 4 + N * 16 - 2 : 0) + 10;
    return { detailRows, hasDelta, TT_H };
  })() : null;

  const TT_H = ttDetail ? ttDetail.TT_H : 0;
  const ttX = ttCX + TT_W + 14 > W ? ttCX - TT_W - 8 : ttCX + 10;
  const ttY = ttd ? Math.max(PAD, Math.min(H - TT_H - PAD, ttCY - TT_H / 2)) : 0;

  const renderTooltip = () => {
    if (!ttd || !ttDetail) return null;
    const els = [];
    let cy = ttY + 10;

    cy += 14;
    els.push(<text key="hk" x={ttX+10} y={cy} fontSize="10" fill="#8B95A1">{ttd.isFuture && !ttd.isCurrent ? '계획' : '실적'} · {ttd.label}</text>);
    els.push(<text key="hr" x={ttX+TT_W-10} y={cy} fontSize="10" fill="#8B95A1" textAnchor="end">{ttd.range||''}</text>);
    cy += 6;
    els.push(<line key="s1" x1={ttX+8} x2={ttX+TT_W-8} y1={cy} y2={cy} stroke="#2D3A4A" strokeWidth="1"/>);
    cy += 18;

    els.push(<text key="v" x={ttX+10} y={cy} fontSize="16" fill="white" fontWeight="700">{(ttd.value*100).toFixed(1)}%</text>);

    if (ttDetail.hasDelta) {
      cy += 16;
      const dSign = ttd.delta >= 0 ? '+' : '';
      const dColor = ttd.delta > 0.005 ? '#00C471' : ttd.delta < -0.005 ? '#F04452' : '#8B95A1';
      els.push(<text key="dt" x={ttX+10} y={cy} fontSize="10" fill={dColor}>직전 주 대비 {dSign}{(ttd.delta*100).toFixed(1)}%p</text>);
    }

    cy += 4;
    els.push(<line key="s2" x1={ttX+8} x2={ttX+TT_W-8} y1={cy} y2={cy} stroke="#2D3A4A" strokeWidth="1"/>);
    cy += 16;

    els.push(<text key="cl" x={ttX+10} y={cy} fontSize="10" fill="#8B95A1">계산 모수 (분모)</text>);
    els.push(<text key="cr" x={ttX+TT_W-10} y={cy} fontSize="10" fill="white" textAnchor="end">{ttd.denominator}명</text>);
    cy += 16;
    els.push(<text key="fl" x={ttX+10} y={cy} fontSize="10" fill="#8B95A1">빌링 합계 (분자)</text>);
    els.push(<text key="fr" x={ttX+TT_W-10} y={cy} fontSize="10" fill="white" textAnchor="end">{ttd.numerator != null ? ttd.numerator.toFixed(1) : '0.0'} FTE</text>);

    if (ttDetail.detailRows.length > 0) {
      cy += 4;
      els.push(<line key="s3" x1={ttX+8} x2={ttX+TT_W-8} y1={cy} y2={cy} stroke="#2D3A4A" strokeWidth="1"/>);
      ttDetail.detailRows.forEach((row, ri) => {
        cy += 14;
        els.push(<text key={`dl${ri}`} x={ttX+10} y={cy} fontSize="10" fill={row.color}>{row.label}</text>);
        els.push(<text key={`dr${ri}`} x={ttX+TT_W-10} y={cy} fontSize="10" fill={row.color} textAnchor="end">{row.value}</text>);
        if (ri < ttDetail.detailRows.length - 1) cy += 2;
      });
    }

    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={ttX} y={ttY} width={TT_W} height={TT_H} rx={6} fill="#191F28" opacity="0.95" />
        {els}
      </g>
    );
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block', minHeight: H }}>
      {/* 격자선 */}
      {[0, 0.5, 0.85, 1.0].map(t => (
        <g key={t}>
          <line x1={PAD} x2={W-PAD} y1={y(t)} y2={y(t)}
            stroke={t === 0.85 ? '#00C471' : '#E5E8EB'}
            strokeDasharray={t === 0.85 ? '0' : '3 3'}
            strokeWidth="1" opacity={t === 0.85 ? 0.7 : 0.5} />
          <text x={8} y={y(t) + 3} fontSize="10"
            fill={t === 0.85 ? '#00C471' : '#8B95A1'}
            fontWeight={t === 0.85 ? 700 : 400}>{(t*100).toFixed(0)}%</text>
        </g>
      ))}
      {/* 실적선 */}
      {realPts.length > 1 && (
        <polyline points={toPts(realPts)} fill="none" stroke="#3182F6" strokeWidth="2.5" strokeLinejoin="round" />
      )}
      {/* 계획선 (점선) */}
      {futurePts.length > 1 && (
        <polyline points={toPts(futurePts)} fill="none" stroke="#8B95A1" strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />
      )}
      {/* 데이터 포인트 + 히트영역 */}
      {data.map((d, i) => (
        <g key={i} style={{ cursor: 'pointer' }}
          onMouseEnter={() => setTtIdx(i)}
          onMouseLeave={() => setTtIdx(null)}>
          <circle cx={x(i)} cy={y(d.value)} r={12} fill="transparent" />
          <circle
            cx={x(i)} cy={y(d.value)}
            r={d.isCurrent ? 5 : ttIdx === i ? 4 : 3}
            fill="white"
            stroke={d.isFuture && !d.isCurrent ? '#8B95A1' : '#3182F6'}
            strokeWidth="2"
          />
          {(i % 3 === 0 || d.isCurrent) && (
            <text x={x(i)} y={H - 6} fontSize="9"
              fill={d.isCurrent ? '#3182F6' : '#8B95A1'}
              textAnchor="middle"
              fontWeight={d.isCurrent ? 700 : 400}>{d.label}</text>
          )}
        </g>
      ))}
      {/* 툴팁 */}
      {renderTooltip()}
    </svg>
  );
}

Object.assign(window, { DashboardView });
