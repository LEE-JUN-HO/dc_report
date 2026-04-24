// 공용 컴포넌트, 헬퍼, 아이콘
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ===== 아이콘 =====
const Icon = ({ name, size = 16, stroke = 1.75 }) => {
  const paths = {
    dashboard: 'M3 12h7V3H3zm0 9h7v-7H3zm11 0h7V12h-7zm0-18v7h7V3z',
    grid:      'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
    pipeline:  'M3 6h18M3 12h12M3 18h6',
    users:     'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    settings:  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.14-1.35l2.03-1.58-2-3.46-2.36.95a7.34 7.34 0 0 0-2.33-1.35L14.2 2h-4.4l-.4 2.45a7.34 7.34 0 0 0-2.33 1.35l-2.36-.95-2 3.46 2.03 1.58A7.4 7.4 0 0 0 4.6 12a7.4 7.4 0 0 0 .14 1.35l-2.03 1.58 2 3.46 2.36-.95a7.34 7.34 0 0 0 2.33 1.35l.4 2.45h4.4l.4-2.45a7.34 7.34 0 0 0 2.33-1.35l2.36.95 2-3.46-2.03-1.58A7.4 7.4 0 0 0 19.4 12z',
    plus:      'M12 5v14M5 12h14',
    x:         'M18 6 6 18M6 6l12 12',
    search:    'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    chevronR:  'M9 18l6-6-6-6',
    chevronD:  'M6 9l6 6 6-6',
    chevronL:  'M15 18l-6-6 6-6',
    arrowUp:   'M12 19V5M5 12l7-7 7 7',
    arrowDown: 'M12 5v14M5 12l7 7 7-7',
    filter:    'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    calendar:  'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
    bell:      'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    edit:      'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-1.5-9.5a2.12 2.12 0 1 1 3 3L12 17l-4 1 1-4 9.5-9.5z',
    trash:     'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    check:     'M20 6L9 17l-5-5',
    alert:     'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    zap:       'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    download:  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload:    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    trending:  'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    sliders:   'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  };
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

// ===== Heat color =====
function heatColor(v) {
  if (v == null) return 'var(--heat-0)';
  if (v > 1.0) return 'var(--heat-over)';
  if (v >= 0.9) return 'var(--heat-10)';
  if (v >= 0.7) return 'var(--heat-08)';
  if (v >= 0.5) return 'var(--heat-06)';
  if (v >= 0.3) return 'var(--heat-04)';
  if (v > 0)    return 'var(--heat-02)';
  return 'var(--heat-0)';
}
function heatTextColor(v) {
  if (v == null) return 'var(--text-subtle)';
  if (v > 1.0) return 'white';
  if (v >= 0.7) return 'white';
  return 'var(--text)';
}

// ===== Avatar =====
const AVATAR_BG = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316','#64748B','#EF4444'];
function Avatar({ name, size = 'sm', userId }) {
  const initial = name ? name.charAt(0) : '?';
  // deterministic color
  let hash = 0;
  const key = userId || name || '';
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const bg = AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
  return (
    <span className={`avatar avatar-${size}`} style={{ background: bg }}>{initial}</span>
  );
}

// ===== Stage pill =====
function StagePill({ stageId }) {
  const s = window.APP_DATA.PIPELINE_STAGES.find(x => x.id === stageId);
  if (!s) return null;
  return (
    <span className="stage-pill" style={{ background: s.color + '22', color: s.color }}>
      <span className="badge-dot" style={{ background: s.color }}></span>
      {s.label}
    </span>
  );
}

// ===== Modal =====
function Modal({ open, onClose, title, children, footer, width }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={width ? { width } : {}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ===== Segmented =====
function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ===== Sparkline =====
function Sparkline({ data, w = 70, h = 22, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPath = `M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`;
  return (
    <svg width={w} height={h}>
      <path d={areaPath} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ===== Bar chart =====
function BarChart({ data, height = 120, color = 'var(--accent)' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '8px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%',
            height: `${(d.value / max) * (height - 28)}px`,
            background: d.color || color,
            borderRadius: '3px 3px 0 0',
            minHeight: 2,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: -16, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              {d.valueLabel || d.value}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// expose
Object.assign(window, { Icon, Avatar, StagePill, Modal, Segmented, Sparkline, BarChart, heatColor, heatTextColor });
