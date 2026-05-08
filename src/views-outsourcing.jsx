// 월간 외주관리
const { useState: useStateO, useMemo: useMemoO, useEffect: useEffectO } = React;

const BILLING_COLORS = {
  billing:  { bg: '#D1FAE5', text: '#065F46', border: '#10B981', label: '빌링' },
  absence:  { bg: '#FFFBEA', text: '#92400E', border: '#F59E0B', label: '부재' },
  standby:  { bg: '#EEF2FF', text: '#3730A3', border: '#6366F1', label: '대기' },
};

function fmtAmount(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100000000) {
    const uk  = Math.floor(abs / 100000000);
    const man = Math.round((abs % 100000000) / 10000);
    return man > 0 ? `${sign}${uk}억${man.toLocaleString()}만` : `${sign}${uk}억`;
  }
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString()}만`;
  return `${sign}${n.toLocaleString()}`;
}

function calcMarginPct(revenue, cost) {
  const r = Number(revenue);
  const c = Number(cost);
  if (!r || r === 0) return null;
  return ((r - c) / r) * 100;
}

function getRecord(partnerId, monthId) {
  return window.APP_DATA.OUTSOURCING_RECORDS?.[partnerId]?.[monthId] || null;
}

// ── main view ──────────────────────────────────────────────────
function OutsourcingView({ onEditPartner, dataVersion }) {
  const [typeFilter, setTypeFilter] = useStateO('all');
  const [statusFilter, setStatusFilter] = useStateO('active');
  const [search, setSearch] = useStateO('');
  const [monthOffset, setMonthOffset] = useStateO(0);
  const [cellModalOpen, setCellModalOpen] = useStateO(false);
  const [cellModalParams, setCellModalParams] = useStateO(null);
  const [sortField, setSortField] = useStateO('name');   // 'company'|'name'|'grade'
  const [sortDir,   setSortDir]   = useStateO('asc');

  const { OUTSOURCING_PARTNERS, MONTHS, TODAY, currentMonthId: getMonthId } = window.APP_DATA;
  const curMonthId = getMonthId(TODAY);
  const curIdx     = MONTHS.findIndex(m => m.id === curMonthId);
  const safeIdx    = curIdx >= 0 ? curIdx : MONTHS.length - 1;
  const currentMonth = MONTHS[safeIdx];

  // 분기 필터 — 기본값: 당월 기준 분기
  const [selectedQuarter, setSelectedQuarter] = useStateO(() => currentMonth?.quarter || 1);

  const WINDOW_SIZE = 8;
  const startIdx    = Math.max(0, Math.min(MONTHS.length - WINDOW_SIZE, safeIdx - 2 + monthOffset));
  const visibleMonths = MONTHS.slice(startIdx, startIdx + WINDOW_SIZE);

  const summaryStats = useMemoO(() => {
    if (!OUTSOURCING_PARTNERS?.length || !currentMonth) {
      return { partner: emptyStats(), freelancer: emptyStats(), currentMonth, selectedQuarter };
    }
    const computeTypeStats = (type) => {
      const ps = OUTSOURCING_PARTNERS.filter(p => p.type === type);
      const sumFor = (monthIds) => {
        let rev = 0, cost = 0;
        ps.forEach(p => monthIds.forEach(mid => {
          const r = getRecord(p.id, mid);
          if (r?.billingStatus === 'billing') {
            rev  += Number(r.revenue || 0);
            cost += Number(r.cost    || 0);
          }
        }));
        return { revenue: rev, cost, margin: calcMarginPct(rev, cost) };
      };
      const qMonths  = MONTHS.filter(m => m.quarter === selectedQuarter).map(m => m.id);
      const yrMonths = MONTHS.map(m => m.id);
      return {
        month:   sumFor([currentMonth.id]),
        quarter: sumFor(qMonths),
        year:    sumFor(yrMonths),
      };
    };
    return {
      partner:    computeTypeStats('partner'),
      freelancer: computeTypeStats('freelancer'),
      currentMonth,
      selectedQuarter,
    };
  }, [dataVersion, safeIdx, selectedQuarter]);

  const visiblePartners = useMemoO(() => {
    if (!OUTSOURCING_PARTNERS) return [];
    return OUTSOURCING_PARTNERS.filter(p => {
      if (typeFilter !== 'all'  && p.type   !== typeFilter)  return false;
      if (statusFilter === 'active' && p.status === 'ended') return false;
      if (search && !p.name.includes(search) && !(p.company || '').includes(search)) return false;
      return true;
    });
  }, [typeFilter, statusFilter, search, dataVersion]);

  const sortItems = (items) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortField === 'company') return dir * (a.company || '').localeCompare(b.company || '', 'ko');
      if (sortField === 'grade')   return dir * (a.grade   || '').localeCompare(b.grade   || '', 'ko');
      return dir * (a.name || '').localeCompare(b.name || '', 'ko');
    });
  };

  const onSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const grouped = useMemoO(() => [
    { type: 'partner',    label: '파트너',    color: '#6366F1', items: sortItems(visiblePartners.filter(p => p.type === 'partner'))    },
    { type: 'freelancer', label: '프리랜서',  color: '#F59E0B', items: sortItems(visiblePartners.filter(p => p.type === 'freelancer')) },
  ].filter(g => g.items.length > 0), [visiblePartners, sortField, sortDir]);

  const openCell = (partnerId, monthId) => {
    setCellModalParams({ partnerId, monthId, current: getRecord(partnerId, monthId) });
    setCellModalOpen(true);
  };

  const saveRecord = async ({ partnerId, monthId, data, clear }) => {
    if (!window.APP_DATA.OUTSOURCING_RECORDS)          window.APP_DATA.OUTSOURCING_RECORDS = {};
    if (!window.APP_DATA.OUTSOURCING_RECORDS[partnerId]) window.APP_DATA.OUTSOURCING_RECORDS[partnerId] = {};
    if (clear) {
      delete window.APP_DATA.OUTSOURCING_RECORDS[partnerId][monthId];
    } else {
      window.APP_DATA.OUTSOURCING_RECORDS[partnerId][monthId] = data;
    }
    if (window.APP_DATA.saveOutsourcingRecord) {
      try { await window.APP_DATA.saveOutsourcingRecord(partnerId, monthId, clear ? null : data); }
      catch (e) { alert('저장 실패: ' + e.message); throw e; }
    }
    window.dispatchEvent(new CustomEvent('data-changed'));
  };

  const totalActive = (OUTSOURCING_PARTNERS || []).filter(p => p.status !== 'ended').length;

  return (
    <div className="col gap-16">
      <OutsourcingSummaryBanner stats={summaryStats} selectedQuarter={selectedQuarter} onSelectQuarter={setSelectedQuarter} />

      {/* Controls */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          <Segmented value={typeFilter} onChange={setTypeFilter}
            options={[
              { value: 'all',        label: '전체' },
              { value: 'partner',    label: '파트너' },
              { value: 'freelancer', label: '프리랜서' },
            ]}
          />
          <Segmented value={statusFilter} onChange={setStatusFilter}
            options={[
              { value: 'active', label: '활성만' },
              { value: 'all',    label: '전체(종료 포함)' },
            ]}
          />
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-subtle)' }}>
              <Icon name="search" size={14} />
            </span>
            <input className="input" placeholder="이름/회사" style={{ paddingLeft: 28, width: 140 }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}></div>
          <div className="row gap-6">
            <button className="btn btn-sm" onClick={() => setMonthOffset(o => o - 1)}><Icon name="chevronL" size={13} /></button>
            <div className="small num" style={{ minWidth: 140, textAlign: 'center', color: 'var(--text-muted)' }}>
              {visibleMonths[0]?.label} ~ {visibleMonths[visibleMonths.length - 1]?.label}
            </div>
            <button className="btn btn-sm" onClick={() => setMonthOffset(o => o + 1)}><Icon name="chevronR" size={13} /></button>
            <button className="btn btn-sm" onClick={() => setMonthOffset(0)}>이번달</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="row gap-12" style={{ paddingLeft: 4 }}>
        {Object.entries(BILLING_COLORS).map(([k, v]) => (
          <div key={k} className="heat-legend">
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: v.bg, border: `1px solid ${v.border}66` }}></span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }}></div>
        <span className="tiny subtle">총 {totalActive}명 활성 · 셀 클릭 → 매출/매입 입력</span>
      </div>

      {/* Table */}
      {grouped.length > 0 ? (
        <OutsourcingTable
          grouped={grouped}
          months={visibleMonths}
          curMonthId={curMonthId}
          onOpenCell={openCell}
          onEditPartner={onEditPartner}
          dataVersion={dataVersion}
          sortField={sortField}
          sortDir={sortDir}
          onSort={onSort}
        />
      ) : (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-subtle)' }}>
          <div className="small bold">등록된 외주 인력이 없습니다</div>
          <div className="tiny subtle" style={{ marginTop: 6 }}>설정 → 외주 관리에서 파트너/프리랜서를 추가하세요</div>
        </div>
      )}

      {cellModalOpen && cellModalParams && (
        <OutsourcingCellModal
          open={cellModalOpen}
          partnerId={cellModalParams.partnerId}
          monthId={cellModalParams.monthId}
          current={cellModalParams.current}
          onClose={() => setCellModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}

function emptyStats() {
  return {
    month:   { revenue: 0, cost: 0, margin: null },
    quarter: { revenue: 0, cost: 0, margin: null },
    year:    { revenue: 0, cost: 0, margin: null },
  };
}

// ── Summary Banner ─────────────────────────────────────────────
function OutsourcingSummaryBanner({ stats, selectedQuarter, onSelectQuarter }) {
  const { currentMonth } = stats;

  const TypeRow = ({ label, color, data }) => {
    const periods = [
      { label: '당월',  sub: `${currentMonth?.month || '?'}월`,  data: data.month   },
      { label: '분기',  sub: `Q${selectedQuarter}`,              data: data.quarter },
      { label: '연간',  sub: String(window.APP_DATA?.MONTHS?.[0]?.year || new Date().getFullYear()), data: data.year    },
    ];
    return (
      <div style={{ flex: 1 }}>
        <div style={{ padding: '10px 18px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 4, height: 16, background: color, borderRadius: 2 }}></span>
          <span className="tiny bold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {periods.map((p, i) => {
            const margin = p.data.margin;
            const mColor = margin == null ? 'var(--text-subtle)'
              : margin >= 25 ? 'var(--success)' : margin >= 15 ? 'var(--accent)' : 'var(--warn)';
            return (
              <div key={p.label} style={{
                padding: '12px 16px',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <div className="row gap-6" style={{ marginBottom: 8 }}>
                  <span className="tiny bold" style={{ color: 'var(--text-muted)' }}>{p.label}</span>
                  <span className="tiny subtle">· {p.sub}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div className="row gap-8">
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', minWidth: 24 }}>매출</span>
                    <span className="small num bold" style={{ color: 'var(--text)' }}>{fmtAmount(p.data.revenue)}</span>
                  </div>
                  <div className="row gap-8">
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', minWidth: 24 }}>매입</span>
                    <span className="small num" style={{ color: 'var(--text-muted)' }}>{fmtAmount(p.data.cost)}</span>
                  </div>
                  <div className="row gap-8">
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', minWidth: 24 }}>마진</span>
                    <span className="small num bold" style={{ color: mColor }}>
                      {margin == null ? '—' : `${margin.toFixed(1)}%`}
                    </span>
                    {margin != null && p.data.revenue > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>
                        ({fmtAmount(p.data.revenue - p.data.cost)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tiny bold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>외주 매출/매입 현황</span>
        <span className="tiny subtle">· 빌링 상태 기준 집계</span>
        <div style={{ flex: 1 }} />
        <span className="tiny subtle">분기 선택:</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => onSelectQuarter(q)}
              style={{
                padding: '3px 9px', borderRadius: 6, border: '1px solid',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background:   selectedQuarter === q ? 'var(--accent)' : 'var(--bg-elev)',
                color:        selectedQuarter === q ? 'white'         : 'var(--text-muted)',
                borderColor:  selectedQuarter === q ? 'var(--accent)' : 'var(--border)',
              }}
            >Q{q}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: 'none' }}>
        <TypeRow label="파트너"    color="#6366F1" data={stats.partner}    />
        <div style={{ width: 1, background: 'var(--border)' }}></div>
        <TypeRow label="프리랜서"  color="#F59E0B" data={stats.freelancer} />
      </div>
    </div>
  );
}

// ── 정렬 아이콘 ────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span style={{ opacity: 0.25, fontSize: 10 }}>⇅</span>;
  return <span style={{ fontSize: 10, color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

// ── Table ──────────────────────────────────────────────────────
function OutsourcingTable({ grouped, months, curMonthId, onOpenCell, onEditPartner, dataVersion, sortField, sortDir, onSort }) {
  const COMPANY_W = 120;
  const NAME_W    = 100;
  const GRADE_W   = 56;
  const CELL_W    = 130;
  const cols = `${COMPANY_W}px ${NAME_W}px ${GRADE_W}px repeat(${months.length}, ${CELL_W}px)`;

  const thStyle = (field) => ({
    padding: '10px 14px', color: 'var(--text-muted)', cursor: 'pointer',
    userSelect: 'none', display: 'flex', alignItems: 'center', gap: 5,
    whiteSpace: 'nowrap',
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ minWidth: COMPANY_W + NAME_W + GRADE_W + months.length * CELL_W }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: cols, position: 'sticky', top: 0, background: 'var(--bg-sunken)', zIndex: 2, borderBottom: '1px solid var(--border)' }}>
          <div className="tiny bold" style={thStyle('company')} onClick={() => onSort('company')}>
            회사명 <SortIcon field="company" sortField={sortField} sortDir={sortDir} />
          </div>
          <div className="tiny bold" style={thStyle('name')} onClick={() => onSort('name')}>
            이름 <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
          </div>
          <div className="tiny bold" style={{ ...thStyle('grade'), padding: '10px 8px' }} onClick={() => onSort('grade')}>
            등급 <SortIcon field="grade" sortField={sortField} sortDir={sortDir} />
          </div>
          {months.map(m => (
            <div key={m.id} style={{
              padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)',
              background: m.id === curMonthId ? 'color-mix(in srgb, var(--bg-sunken) 60%, var(--accent-weak))' : undefined,
            }}>
              <div className="tiny bold" style={{ color: m.id === curMonthId ? 'var(--accent)' : 'var(--text-muted)' }}>{m.fullLabel}</div>
              <div className="tiny subtle">Q{m.quarter}</div>
            </div>
          ))}
        </div>

        {grouped.map(({ type, label, color, items }) => {
          // 그룹 소계 행
          const groupSubtotals = months.map(m => {
            let rev = 0, cost = 0, billingCount = 0;
            items.forEach(p => {
              const r = getRecord(p.id, m.id);
              if (r?.billingStatus === 'billing') {
                rev  += Number(r.revenue || 0);
                cost += Number(r.cost    || 0);
                billingCount++;
              }
            });
            return { revenue: rev, cost, billingCount, margin: calcMarginPct(rev, cost) };
          });

          return (
            <div key={type}>
              {/* Group header */}
              <div style={{ display: 'grid', gridTemplateColumns: cols, background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)' }}>
                <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: color, borderRadius: 2 }}></span>
                  <span className="bold small">{label}</span>
                  <span className="tiny subtle">· {items.length}명</span>
                </div>
                <div></div>
                <div></div>
                {groupSubtotals.map((s, i) => (
                  <div key={months[i].id} style={{ padding: '8px 10px', borderLeft: '1px solid var(--border)', textAlign: 'right' }}>
                    {s.revenue > 0 && <>
                      <div className="tiny num bold" style={{ color: 'var(--text)' }}>{fmtAmount(s.revenue)}</div>
                      {s.margin != null && (
                        <div className="tiny num" style={{ color: s.margin >= 20 ? 'var(--success)' : 'var(--warn)' }}>
                          {s.margin.toFixed(0)}%
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: 'var(--text-subtle)' }}>빌링 {s.billingCount}명</div>
                    </>}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {items.map(p => (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  borderTop: '1px solid var(--border)',
                  opacity: p.status === 'ended' ? 0.5 : 1,
                }}>
                  <div style={{ padding: '6px 14px 6px 22px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="small" style={{ color: 'var(--text-muted)' }}>{p.company || '—'}</span>
                    {p.status === 'ended'   && <span className="badge" style={{ fontSize: 9, background: 'var(--bg-sunken)' }}>종료</span>}
                    {p.status === 'inactive' && <span className="badge" style={{ fontSize: 9, background: 'var(--warn-weak)', color: 'var(--warn)' }}>비활성</span>}
                  </div>
                  <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => onEditPartner && onEditPartner(p.id)}>
                    <span className="small bold">{p.name}</span>
                    {p.endDate && isExpiringSoon(p.endDate) && (
                      <span title={`계약 만료: ${p.endDate}`} style={{ fontSize: 10, color: 'var(--warn)' }}>⚠</span>
                    )}
                  </div>
                  <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
                    <span className="tiny" style={{ color: window.APP_DATA.LEVEL_COLORS?.[p.grade] || 'var(--text-subtle)', fontWeight: 600 }}>
                      {p.grade || '—'}
                    </span>
                  </div>
                  {months.map(m => (
                    <OutsourcingCell
                      key={m.id}
                      record={getRecord(p.id, m.id)}
                      isCurrent={m.id === curMonthId}
                      onClick={() => onOpenCell(p.id, m.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const end  = new Date(dateStr);
  const now  = new Date();
  const diff = (end - now) / 86400000;
  return diff >= 0 && diff <= 30;
}

// ── Cell ───────────────────────────────────────────────────────
function OutsourcingCell({ record, isCurrent, onClick }) {
  const [hover, setHover] = useStateO(false);
  const bs  = record?.billingStatus;
  const bc  = bs ? BILLING_COLORS[bs] : null;
  const margin = calcMarginPct(record?.revenue, record?.cost);

  return (
    <div
      style={{
        borderLeft: '1px solid var(--border)',
        background: bc
          ? bc.bg
          : isCurrent
            ? 'color-mix(in srgb, var(--bg-elev) 88%, var(--accent-weak))'
            : 'var(--bg-elev)',
        cursor: 'pointer',
        padding: '6px 10px',
        minHeight: 58,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        position: 'relative',
        boxShadow: isCurrent ? 'inset 0 0 0 1px var(--accent)' : 'none',
        filter: hover ? 'brightness(0.97)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {bc ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
              background: bc.text + '22', color: bc.text, fontSize: 10, fontWeight: 700,
            }}>{bc.label}</span>
            {record?.project && (
              <span style={{ fontSize: 10, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>
                {record.project}
              </span>
            )}
          </div>
          {record?.revenue != null && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, color: 'var(--text-subtle)', width: 22 }}>매출</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmtAmount(record.revenue)}</span>
            </div>
          )}
          {record?.cost != null && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, color: 'var(--text-subtle)', width: 22 }}>매입</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmtAmount(record.cost)}</span>
            </div>
          )}
          {margin != null && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, color: 'var(--text-subtle)', width: 22 }}>마진</span>
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: margin >= 20 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--warn)',
              }}>{margin.toFixed(0)}%</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: 18, color: 'var(--border)', opacity: hover ? 0.8 : 0.35, transition: 'opacity 0.1s' }}>+</span>
        </div>
      )}
    </div>
  );
}

// ── Cell Edit Modal ────────────────────────────────────────────
function OutsourcingCellModal({ open, partnerId, monthId, current, onClose, onSave }) {
  const { OUTSOURCING_PARTNERS, MONTHS } = window.APP_DATA;
  const partner = OUTSOURCING_PARTNERS?.find(p => p.id === partnerId);
  const month   = MONTHS?.find(m => m.id === monthId);

  const [billingStatus, setBillingStatus] = useStateO(current?.billingStatus || 'billing');
  const [revenue,  setRevenue]  = useStateO(current?.revenue  ?? '');
  const [cost,     setCost]     = useStateO(current?.cost     ?? '');
  const [project,  setProject]  = useStateO(current?.project  || '');
  const [note,     setNote]     = useStateO(current?.note     || '');
  const [saving,   setSaving]   = useStateO(false);

  useEffectO(() => {
    if (open) {
      setBillingStatus(current?.billingStatus || 'billing');
      setRevenue(current?.revenue ?? '');
      setCost(current?.cost ?? '');
      setProject(current?.project || '');
      setNote(current?.note || '');
      setSaving(false);
    }
  }, [open, partnerId, monthId]);

  if (!open || !partner || !month) return null;

  const revNum    = revenue === '' ? null : Number(revenue);
  const costNum   = cost    === '' ? null : Number(cost);
  const margin    = calcMarginPct(revNum, costNum);
  const profit    = revNum != null && costNum != null ? revNum - costNum : null;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        partnerId, monthId,
        data: {
          billingStatus,
          revenue: revNum,
          cost:    costNum,
          project: project || null,
          note:    note    || null,
        },
      });
      onClose();
    } finally { setSaving(false); }
  };

  const clear = async () => {
    if (saving || !current) return;
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    setSaving(true);
    try {
      await onSave({ partnerId, monthId, clear: true });
      onClose();
    } finally { setSaving(false); }
  };

  const typeLabel = partner.type === 'partner' ? '파트너' : '프리랜서';

  return (
    <Modal open={open} onClose={onClose} width={480} title="외주 기록 편집"
      footer={(
        <>
          {current && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={clear} disabled={saving}>삭제</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </>
      )}
    >
      <div style={{ padding: '16px 20px 8px' }}>
        {/* Partner info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-sunken)', borderRadius: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="small bold">{partner.name}</span>
              <span className="badge" style={{ fontSize: 9 }}>{typeLabel}</span>
              {partner.grade && <span className="tiny" style={{ color: window.APP_DATA.LEVEL_COLORS?.[partner.grade] || 'var(--text-subtle)', fontWeight: 600 }}>{partner.grade}</span>}
            </div>
            {partner.company && <div className="tiny subtle">{partner.company}</div>}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="small bold" style={{ color: 'var(--accent)' }}>{month.fullLabel}</div>
          </div>
        </div>

        {/* Billing status */}
        <div className="field">
          <div className="field-label">빌링 상태</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(BILLING_COLORS).map(([k, v]) => (
              <button key={k} className="btn btn-sm"
                style={{
                  flex: 1, padding: '7px 8px',
                  background:   billingStatus === k ? v.text   : 'var(--bg-elev)',
                  color:        billingStatus === k ? 'white'  : 'var(--text)',
                  borderColor:  billingStatus === k ? v.text   : 'var(--border)',
                }}
                onClick={() => setBillingStatus(k)}>{v.label}</button>
            ))}
          </div>
        </div>

        {/* Revenue / Cost */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">매출액 (원)</div>
            <input className="input" type="number" min="0" placeholder="예: 5000000"
              value={revenue} onChange={e => setRevenue(e.target.value)} />
            {revenue !== '' && <div className="field-hint">{fmtAmount(Number(revenue))}</div>}
          </div>
          <div className="field">
            <div className="field-label">매입액 (원)</div>
            <input className="input" type="number" min="0" placeholder="예: 4000000"
              value={cost} onChange={e => setCost(e.target.value)} />
            {cost !== '' && <div className="field-hint">{fmtAmount(Number(cost))}</div>}
          </div>
        </div>

        {/* Margin preview */}
        {margin != null && (
          <div style={{
            display: 'flex', gap: 24,
            padding: '12px 16px', borderRadius: 8, marginBottom: 12,
            background: margin >= 20 ? 'var(--success-weak)' : margin >= 10 ? 'var(--accent-weak)' : 'var(--warn-weak)',
          }}>
            <div>
              <div className="tiny subtle">마진율</div>
              <div className="num bold" style={{
                fontSize: 22,
                color: margin >= 20 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--warn)',
              }}>{margin.toFixed(1)}%</div>
            </div>
            {profit != null && (
              <div>
                <div className="tiny subtle">마진액</div>
                <div className="num bold" style={{ fontSize: 18 }}>{fmtAmount(profit)}</div>
              </div>
            )}
          </div>
        )}

        <div className="field">
          <div className="field-label">프로젝트 / 고객사</div>
          <input className="input" placeholder="예: 삼성전자 AI 프로젝트" value={project} onChange={e => setProject(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">비고</div>
          <input className="input" placeholder="메모" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { OutsourcingView });
