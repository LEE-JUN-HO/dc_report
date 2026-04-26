// 대시보드 — 실데이터 버전
const { useMemo: useMemoDash } = React;

function DashboardView({ onNavigate, dataVersion }) {
  const { USERS, TEAMS, WEEKS, PIPELINE, computeUtilization, currentWeekIdx, KPI_TARGET, isUserInUtilizationBase } = window.APP_DATA;
  const curIdx = currentWeekIdx();
  const currentWeek = WEEKS[curIdx];
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
      month:   compute(w => w.month === currentWeek.month),
      quarter: compute(w => w.quarter === currentWeek.quarter),
      half:    compute(w => w.half === currentWeek.half),
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
    return slice.map((w, idx) => {
      const vals = USERS.filter(u => isUserInUtilizationBase(u, w)).map(u => computeUtilization(u.id, w.id).value);
      const avg = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
      return { label: w.label, value: avg, isCurrent: w.num - 1 === curIdx, isFuture: w.num - 1 > curIdx };
    });
  }, [dataVersion]);

  const alerts = useMemoDash(() => {
    const over = [], under = [], onLeave = [];
    currentBaseUsers.forEach(u => {
      const d = computeUtilization(u.id, currentWeek.id);
      if (d.value > 1.0) over.push({ user: u, value: d.value });
      else if (d.note && !d.client) onLeave.push({ user: u, note: d.note });
      else if (d.value < 0.5) under.push({ user: u, value: d.value });
    });
    return { over, under, onLeave };
  }, [dataVersion]);

  const pipelineStats = useMemoDash(() => {
    const cnt = { '완료': 0, '확정': 0, '예정': 0 };
    const mm  = { '완료': 0, '확정': 0, '예정': 0 };
    PIPELINE.forEach(p => {
      cnt[p.status]++;
      mm[p.status] += (p.mm || 0);
    });
    return { cnt, mm, total: PIPELINE.length };
  }, [dataVersion]);

  const delta = weekAvg - lastWeekAvg;

  return (
    <div className="col gap-16">
      <div className="kpi-grid">
        <KpiCard
          label="이번 주 전사 가동률"
          value={`${(weekAvg * 100).toFixed(1)}`} unit="%"
          delta={delta} deltaLabel="vs 지난 주"
          sparkData={trend.slice(0, 13).map(t => t.value)}
          targetHint={weekAvg < KPI_TARGET ? `목표 85% · ${((KPI_TARGET - weekAvg) * currentBaseUsers.length).toFixed(1)} FTE 미달` : '목표 달성 ✓'}
        />
        <KpiCard
          label={`${currentWeek.month}월 평균`}
          value={`${(periodAvgs.month * 100).toFixed(1)}`} unit="%"
          sub={`Q${currentWeek.quarter} ${(periodAvgs.quarter * 100).toFixed(1)}% · ${currentWeek.half} ${(periodAvgs.half * 100).toFixed(1)}%`}
        />
        <KpiCard
          label="재직 / 전체"
          value={activeUsers.length} unit={`명 / ${USERS.length}`}
          sub={`${TEAMS.length}개 팀 · 퇴사 ${USERS.filter(u=>u.status==='resigned').length} · 휴직 ${USERS.filter(u=>u.status==='leave').length}`}
        />
        <KpiCard
          label="파이프라인"
          value={pipelineStats.total} unit="건"
          sub={`확정 ${pipelineStats.cnt['확정']} · 예정 ${pipelineStats.cnt['예정']} · 완료 ${pipelineStats.cnt['완료']}`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
        <AlertCard
          title="과부하"
          iconBg="var(--danger-weak)" iconColor="var(--danger)"
          count={alerts.over.length} subtitle=">100%"
          items={alerts.over.slice(0, 3).map(a => ({ name: a.user.name, meta: `${(a.value*100).toFixed(0)}%`, color: 'var(--danger)', userId: a.user.id }))}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <AlertCard
          title="저활용"
          iconBg="var(--warn-weak)" iconColor="var(--warn)"
          count={alerts.under.length} subtitle="<50%"
          items={alerts.under.slice(0, 3).map(a => ({ name: a.user.name, meta: `${(a.value*100).toFixed(0)}%`, color: 'var(--warn)', userId: a.user.id }))}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <AlertCard
          title="부재"
          iconBg="var(--bg-sunken)" iconColor="var(--text-muted)"
          count={alerts.onLeave.length} subtitle="휴가·교육 등"
          items={alerts.onLeave.slice(0, 3).map(a => ({ name: a.user.name, meta: a.note.substring(0, 10), color: 'var(--text-muted)', userId: a.user.id }))}
          onItemClick={(item) => onNavigate('user', item.userId)}
        />
        <LevelCard activeUsers={activeUsers} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">가동률 트렌드</div>
              <div className="card-sub">지난 12주 실적 + 향후 8주 계획</div>
            </div>
            <div style={{ flex: 1 }}></div>
            <span className="badge"><span className="badge-dot" style={{ background: 'var(--accent)' }}></span>실적</span>
            <span className="badge"><span className="badge-dot" style={{ background: 'var(--text-subtle)' }}></span>계획</span>
          </div>
          <div style={{ padding: '18px 18px 14px' }}>
            <TrendChart data={trend} />
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

function LevelCard({ activeUsers }) {
  const { LEVELS, LEVEL_COLORS } = window.APP_DATA;
  const counts = {};
  LEVELS.forEach(l => counts[l] = 0);
  activeUsers.forEach(u => counts[u.level] = (counts[u.level] || 0) + 1);
  return (
    <div className="card">
      <div style={{ padding: '14px 18px 10px' }}>
        <div className="small bold">등급 구성</div>
        <div className="tiny subtle">재직자 {activeUsers.length}명</div>
      </div>
      <div style={{ padding: '0 18px 14px' }}>
        {LEVELS.map(l => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_COLORS[l] }}></span>
            <span className="small" style={{ flex: 1 }}>{l}</span>
            <span className="small num bold">{counts[l]}</span>
          </div>
        ))}
      </div>
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

function KpiCard({ label, value, unit, delta, deltaLabel, sparkData, sub, targetHint }) {
  const trend = delta != null ? (delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'flat') : null;
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
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

function AlertCard({ title, iconBg, iconColor, count, subtitle, items, onItemClick }) {
  return (
    <div className="card">
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor, display: 'grid', placeItems: 'center' }}>
          <Icon name="alert" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="small bold">{title}</div>
          <div className="tiny subtle">{subtitle}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: iconColor, lineHeight: 1 }}>{count}</div>
      </div>
      <div style={{ padding: '4px 18px 14px' }}>
        {items.length === 0 ? (
          <div className="tiny subtle" style={{ padding: '6px 0' }}>해당 없음 ✓</div>
        ) : items.map((item, i) => (
          <div key={i} style={{ padding: '5px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onItemClick(item)}>
            <Avatar name={item.name} userId={item.userId} size="sm" />
            <span className="small" style={{ flex: 1 }}>{item.name}</span>
            <span className="tiny bold ellipsis" style={{ color: item.color, maxWidth: 80 }}>{item.meta}</span>
          </div>
        ))}
      </div>
    </div>
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

function TrendChart({ data }) {
  const W = 560, H = 170, PAD = 26;
  const maxY = 1.1;
  const y = v => H - PAD - (v / maxY) * (H - PAD * 2);
  const x = i => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const realPts = data.map((d, i) => ({ ...d, _i: i })).filter(d => !d.isFuture || d.isCurrent);
  const futurePts = data.map((d, i) => ({ ...d, _i: i })).filter(d => d.isFuture || d.isCurrent);
  const toPts = arr => arr.map(d => `${x(d._i)},${y(d.value)}`).join(' ');
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0, 0.5, 0.85, 1.0].map(t => (
        <g key={t}>
          <line x1={PAD} x2={W-PAD} y1={y(t)} y2={y(t)} stroke={t === 0.85 ? 'var(--success)' : 'var(--border)'} strokeDasharray={t === 0.85 ? '0' : '3 3'} strokeWidth={t === 0.85 ? 1 : 1} opacity={t === 0.85 ? 0.5 : 0.4} />
          <text x={8} y={y(t) + 3} fontSize="10" fill={t === 0.85 ? 'var(--success)' : 'var(--text-subtle)'} fontWeight={t === 0.85 ? 700 : 400}>{(t*100).toFixed(0)}%</text>
        </g>
      ))}
      {realPts.length > 1 && <polyline points={toPts(realPts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />}
      {futurePts.length > 1 && <polyline points={toPts(futurePts)} fill="none" stroke="var(--text-subtle)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={d.isCurrent ? 4 : 2.5} fill={d.isCurrent ? 'var(--accent)' : d.isFuture ? 'white' : 'white'} stroke={d.isFuture ? 'var(--text-subtle)' : 'var(--accent)'} strokeWidth="2" />
          {(i % 3 === 0 || d.isCurrent) && (
            <text x={x(i)} y={H-6} fontSize="9" fill={d.isCurrent ? 'var(--accent-strong)' : 'var(--text-subtle)'} textAnchor="middle" fontWeight={d.isCurrent ? 700 : 400}>{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

Object.assign(window, { DashboardView });
