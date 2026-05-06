// 개인/팀/프로젝트 상세 뷰 — 실데이터 버전
const { useState: useStateD, useMemo: useMemoD } = React;

// ===== 개인 상세 =====
function UserDetail({ userId, onBack, onProjectClick }) {
  const { USERS, TEAMS, WEEKS, PIPELINE, computeUtilization, currentWeekIdx, LEVEL_COLORS, STATUSES } = window.APP_DATA;
  const user = USERS.find(u => u.id === userId);
  if (!user) return <div className="muted">사용자 없음</div>;
  const team = TEAMS.find(t => t.id === user.team);
  const curIdx = currentWeekIdx();

  // 전체 53주 가동률
  const allWeeks = WEEKS.map(w => ({
    ...w,
    data: computeUtilization(user.id, w.id),
    isCurrent: w.num - 1 === curIdx,
    isPast:    w.num - 1 < curIdx,
  }));

  const currentUtil = computeUtilization(user.id, WEEKS[curIdx].id).value;

  // 고객사별 집계 (2026년 전체)
  const clientStats = {};
  allWeeks.forEach(w => {
    if (w.data.client) {
      if (!clientStats[w.data.client]) clientStats[w.data.client] = { weeks: 0, totalBilling: 0 };
      clientStats[w.data.client].weeks++;
      clientStats[w.data.client].totalBilling += w.data.value || 0;
    }
  });
  const clientList = Object.entries(clientStats).sort((a, b) => b[1].totalBilling - a[1].totalBilling);

  // 파이프라인에서 이 사람 관련 건 찾기 (멤버 문자열에 이름 포함)
  const myPipeline = PIPELINE.filter(p => (p.members || '').includes(user.name));

  // 연간 평균
  const yearAvg = allWeeks.reduce((s, w) => s + w.data.value, 0) / allWeeks.length;
  const pastAvg = allWeeks.filter(w => w.isPast || w.isCurrent).reduce((s, w) => s + w.data.value, 0) / allWeeks.filter(w => w.isPast || w.isCurrent).length;

  return (
    <div className="col gap-16">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        <Icon name="chevronL" size={13} /> 뒤로
      </button>

      <div className="card" style={{ padding: '22px 26px' }}>
        <div className="row gap-16">
          <Avatar name={user.name} userId={user.id} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {user.name}
              {user.isManager && <span className="badge" style={{ marginLeft: 10, fontSize: 11 }}>관리자</span>}
              {user.status !== 'active' && <span className="badge" style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg-sunken)' }}>{STATUSES[user.status].label}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <span style={{ width: 3, height: 12, background: team.color, borderRadius: 2 }}></span>
              <span className="small">{team.name}</span>
              <span className="subtle">·</span>
              <span className="small" style={{ color: LEVEL_COLORS[user.level], fontWeight: 600 }}>{user.level}</span>
              {user.joinedAt && <><span className="subtle">·</span><span className="tiny subtle">입사 {user.joinedAt}</span></>}
              {user.resignedAt && <><span className="subtle">·</span><span className="tiny subtle">퇴사 {user.resignedAt}</span></>}
              {user.note && <><span className="subtle">·</span><span className="tiny subtle">{user.note}</span></>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny subtle">이번 주</div>
            <div className="num bold" style={{ fontSize: 28, color: currentUtil > 1 ? 'var(--danger)' : currentUtil < 0.5 ? 'var(--warn)' : 'var(--success)' }}>
              {(currentUtil * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <div className="tiny subtle">YTD 평균</div>
            <div className="num bold" style={{ fontSize: 28, color: 'var(--text)' }}>{(pastAvg * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">2026년 주간 가동률 (W1~W53)</div>
            <div className="card-sub">왼쪽부터 W1 · 옅은 회색: 미래 계획</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <UserFullYearChart data={allWeeks} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">고객사별 누적</div><div className="card-sub">2026 총 {clientList.length}개 고객사</div></div>
          <div style={{ padding: '10px 18px 14px' }}>
            {clientList.length === 0 && <div className="small subtle">배정 이력 없음</div>}
            {clientList.map(([client, s]) => (
              <div key={client} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="small bold" style={{ flex: 1 }}>{client}</span>
                  <span className="tiny num subtle">{s.weeks}주</span>
                  <span className="small num bold" style={{ marginLeft: 10, minWidth: 40, textAlign: 'right' }}>{s.totalBilling.toFixed(1)}</span>
                </div>
                <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: (s.totalBilling / 53 * 100) + '%', height: '100%', background: team.color, borderRadius: 2 }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">파이프라인 관련 건</div><div className="card-sub">이름 매칭 {myPipeline.length}건</div></div>
          {myPipeline.length === 0 ? (
            <div className="small subtle" style={{ padding: 20 }}>관련 건 없음</div>
          ) : (
            <table className="data-table">
              <tbody>
                {myPipeline.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onProjectClick(p.id)}>
                    <td><span className="bold small">{p.client}</span></td>
                    <td><span className="badge" style={{ fontSize: 10 }}>{p.kind}</span></td>
                    <td className="tiny">{p.status}</td>
                    <td className="tiny num subtle">{p.start?.slice(5)} → {p.end?.slice(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function UserFullYearChart({ data }) {
  const W = 1100, H = 160, PAD_L = 30, PAD_T = 10, PAD_B = 40;
  const n = data.length;
  const barW = (W - PAD_L - 10) / n - 1;
  const maxY = 1.2;
  const y = v => H - PAD_B - (v / maxY) * (H - PAD_T - PAD_B);
  return (
    <svg width="100%" height={H + 20} viewBox={`0 0 ${W} ${H+20}`}>
      {[0, 0.5, 0.85, 1.0].map(t => (
        <g key={t}>
          <line x1={PAD_L} x2={W-4} y1={y(t)} y2={y(t)} stroke={t === 0.85 ? 'var(--success)' : 'var(--border)'} strokeDasharray={t === 0.85 ? '0' : '2 3'} opacity={t === 0.85 ? 0.5 : 0.4} />
          <text x={4} y={y(t) + 3} fontSize="9" fill={t === 0.85 ? 'var(--success)' : 'var(--text-subtle)'} fontWeight={t === 0.85 ? 600 : 400}>{(t*100).toFixed(0)}</text>
        </g>
      ))}
      {data.map((w, i) => {
        const x = PAD_L + 4 + i * (barW + 1);
        const v = w.data.value || 0;
        const hasNote = !!w.data.note;
        const height = H - PAD_B - y(v);
        const color = v > 1 ? 'var(--danger)' : w.isFuture ? 'var(--text-subtle)' : w.isPast ? 'var(--accent)' : 'var(--accent)';
        return (
          <g key={i}>
            {v > 0 && <rect x={x} y={y(v)} width={barW} height={height} fill={color} opacity={w.isFuture ? 0.35 : w.isCurrent ? 1 : 0.7} rx="1.5" />}
            {hasNote && !v && <rect x={x} y={y(0.1)} width={barW} height={3} fill="var(--warn)" rx="1" />}
            {w.isCurrent && <rect x={x-1} y={PAD_T} width={barW+2} height={H-PAD_B-PAD_T} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />}
          </g>
        );
      })}
      {/* quarter labels */}
      {[1, 14, 27, 40].map(q => {
        const x = PAD_L + 4 + (q - 1) * (barW + 1);
        return <text key={q} x={x} y={H - PAD_B + 14} fontSize="9" fill="var(--text-subtle)" fontWeight="600">Q{Math.floor(q/13)+1}</text>;
      })}
      {/* week labels (every 4 weeks) */}
      {data.filter((_, i) => i % 4 === 0 || data[i].isCurrent).map((w, idx) => {
        const actualI = data.indexOf(w);
        const x = PAD_L + 4 + actualI * (barW + 1) + barW/2;
        return <text key={idx} x={x} y={H - PAD_B + 26} fontSize="8" fill={w.isCurrent ? 'var(--accent-strong)' : 'var(--text-subtle)'} textAnchor="middle" fontWeight={w.isCurrent ? 700 : 400}>{w.label}</text>;
      })}
    </svg>
  );
}

// ===== 팀 상세 =====
function TeamDetail({ teamId, onBack, onSelectUser }) {
  const { USERS, TEAMS, WEEKS, computeUtilization, currentWeekIdx, STATUSES, LEVEL_COLORS, isUserInUtilizationBase } = window.APP_DATA;
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return <div className="muted">팀 없음</div>;
  const members = USERS.filter(u => u.team === teamId);
  const active = members.filter(u => u.status === 'active');
  const curIdx = currentWeekIdx();
  const baseActive = active.filter(u => isUserInUtilizationBase(u, WEEKS[curIdx]));
  const weekAvg = baseActive.reduce((s, m) => s + computeUtilization(m.id, WEEKS[curIdx].id).value, 0) / (baseActive.length || 1);

  return (
    <div className="col gap-16">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        <Icon name="chevronL" size={13} /> 뒤로
      </button>

      <div className="card" style={{ padding: '22px 26px' }}>
        <div className="row gap-16">
          <div style={{ width: 52, height: 52, borderRadius: 12, background: team.color, display: 'grid', placeItems: 'center', color: 'white', fontSize: 22, fontWeight: 700 }}>{team.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{team.name}</div>
            <div className="small muted">계산 모수 {baseActive.length}명 · 재직 {active.length}명 · 전체 {members.length}명</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny subtle">이번 주 평균</div>
            <div className="num bold" style={{ fontSize: 28, color: weekAvg > 1 ? 'var(--danger)' : weekAvg < 0.6 ? 'var(--warn)' : 'var(--success)' }}>
              {(weekAvg * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">팀원</div></div>
        <table className="data-table">
          <thead><tr><th>이름</th><th>등급</th><th>상태</th><th>이번 주</th><th>지난 4주 평균</th><th>YTD</th></tr></thead>
          <tbody>
            {members.map(u => {
              const now = computeUtilization(u.id, WEEKS[curIdx].id).value;
              const last4 = [0,1,2,3].map(i => curIdx - i >= 0 ? computeUtilization(u.id, WEEKS[curIdx-i].id).value : 0);
              const avg4 = last4.reduce((a,b)=>a+b,0) / 4;
              const ytd = WEEKS.slice(0, curIdx + 1).reduce((s, w) => s + computeUtilization(u.id, w.id).value, 0) / (curIdx + 1);
              return (
                <tr key={u.id} style={{ cursor: 'pointer', opacity: u.status === 'active' ? 1 : 0.55 }} onClick={() => onSelectUser(u.id)}>
                  <td><div className="row gap-8"><Avatar name={u.name} userId={u.id} size="sm" /><span className="bold small">{u.name}</span>{u.isManager && <span className="badge" style={{ fontSize: 9 }}>관리자</span>}</div></td>
                  <td><span className="small" style={{ color: LEVEL_COLORS[u.level], fontWeight: 600 }}>{u.level}</span></td>
                  <td><span className="badge" style={{ fontSize: 10 }}>{STATUSES[u.status].label}</span></td>
                  <td><span className="small num bold" style={{ color: now > 1 ? 'var(--danger)' : now < 0.5 ? 'var(--warn)' : 'var(--text)' }}>{(now*100).toFixed(0)}%</span></td>
                  <td className="small num muted">{(avg4*100).toFixed(0)}%</td>
                  <td className="small num muted">{(ytd*100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== 프로젝트 상세 =====
function ProjectDetail({ projectId, onBack, onEdit, onDelete }) {
  const { PIPELINE } = window.APP_DATA;
  const p = PIPELINE.find(x => x.id === projectId);
  if (!p) return <div className="muted">프로젝트 없음</div>;
  const priorityLabel = (priority) => {
    const n = Number(priority);
    if (n === 1) return '최우선';
    if (n === 55) return '집중';
    if (n === 99) return '관망';
    return String(priority ?? '—');
  };

  return (
    <div className="col gap-16">
      <div className="row gap-8">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="chevronL" size={13} /> 뒤로
        </button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-sm" onClick={() => onEdit && onEdit(p.id)}>
          <Icon name="edit" size={13} /> 수정
        </button>
        <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => onDelete && onDelete(p.id)}>
          <Icon name="trash" size={13} /> 삭제
        </button>
      </div>

      <div className="card" style={{ padding: '22px 26px' }}>
        <div className="row gap-12" style={{ marginBottom: 12 }}>
          <span className="tiny subtle">우선순위</span>
          <span className="bold small">{priorityLabel(p.priority)}</span>
          <span className="tiny subtle" style={{ marginLeft: 14 }}>#{p.id}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{p.client}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <span className="badge">{p.kind}</span>
          <span className="stage-pill" style={{ background: getStatusColor(p.status) + '22', color: getStatusColor(p.status) }}>
            <span className="badge-dot" style={{ background: getStatusColor(p.status) }}></span>{p.status}
          </span>
          <span className="badge">수주확률 {p.winProbability == null ? '—' : Math.max(0, Math.min(100, Number(p.winProbability))).toFixed(0) + '%'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20 }}>
          <DetailStat label="기간" value={p.start && p.end ? `${p.start.slice(5)} → ${p.end.slice(5)}` : (p.start?.slice(5) || '미정')} />
          <DetailStat label="MM" value={p.mm != null ? p.mm + 'MM' : '미정'} />
          <DetailStat label="수주확률" value={p.winProbability == null ? '미정' : Math.max(0, Math.min(100, Number(p.winProbability))).toFixed(0) + '%'} />
          <DetailStat label="Sales" value={p.sales || '—'} />
        </div>

        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <div className="tiny subtle" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>투입 예상 인원</div>
          <div className="small">{p.members || <span className="subtle">미정</span>}</div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div className="tiny subtle" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>진행 상세</div>
          <div className="small" style={{ lineHeight: 1.6 }}>{p.note || <span className="subtle">내용 없음</span>}</div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div>
      <div className="tiny subtle" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div className="bold" style={{ fontSize: 15, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function getStatusColor(status) {
  const { PIPELINE_STAGES } = window.APP_DATA;
  return PIPELINE_STAGES.find(s => s.id === status)?.color || '#64748B';
}

Object.assign(window, { UserDetail, TeamDetail, ProjectDetail });
