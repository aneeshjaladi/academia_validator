import React from 'react';

/* ── Button ── */
export function Btn({ children, variant = 'primary', size = 'md', loading, icon, className = '', ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
    borderRadius: 'var(--radius-sm)', border: 'none', transition: 'all 0.18s',
    whiteSpace: 'nowrap',
    ...(size === 'sm' ? { padding: '7px 14px', fontSize: 13 } : size === 'lg' ? { padding: '13px 28px', fontSize: 16 } : { padding: '10px 20px', fontSize: 14 }),
  };
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 16px rgba(79,124,255,0.3)' },
    secondary: { background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' },
    danger: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,79,106,0.3)' },
    ghost: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)' },
    success: { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(16,217,160,0.3)' },
  };
  return (
    <button style={{ ...base, ...variants[variant], opacity: loading || props.disabled ? 0.6 : 1 }} className={className} {...props}>
      {loading ? <Spinner size={14} /> : icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

/* ── Badge ── */
export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: { bg: 'var(--accent-glow)', text: 'var(--accent-2)', border: 'rgba(79,124,255,0.25)' },
    green: { bg: 'var(--green-dim)', text: 'var(--green)', border: 'rgba(16,217,160,0.25)' },
    red: { bg: 'var(--red-dim)', text: 'var(--red)', border: 'rgba(255,79,106,0.25)' },
    amber: { bg: 'var(--amber-dim)', text: 'var(--amber)', border: 'rgba(255,179,64,0.25)' },
    gray: { bg: 'rgba(100,116,139,0.1)', text: 'var(--text-2)', border: 'rgba(100,116,139,0.2)' },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      fontFamily: 'var(--font-mono)',
    }}>{children}</span>
  );
}

/* ── Card ── */
export function Card({ children, className = '', style = {}, hover = false }) {
  return (
    <div className={className} style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 24,
      transition: hover ? 'border-color 0.2s, box-shadow 0.2s' : undefined,
      ...(hover ? { cursor: 'pointer' } : {}),
      ...style,
    }}
    onMouseEnter={hover ? e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.boxShadow = 'var(--shadow-accent)'; } : undefined}
    onMouseLeave={hover ? e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
    >{children}</div>
  );
}

/* ── StatCard ── */
export function StatCard({ label, value, icon, color = 'blue', delta, sub }) {
  const colors = { blue: 'var(--accent)', green: 'var(--green)', red: 'var(--red)', amber: 'var(--amber)' };
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 22, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: colors[color], lineHeight: 1 }}>{value}</span>
        {delta && <span style={{ fontSize: 13, color: delta > 0 ? 'var(--green)' : 'var(--red)', marginBottom: 4 }}>{delta > 0 ? '+' : ''}{delta}%</span>}
      </div>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</span>}
    </Card>
  );
}

/* ── Spinner ── */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

/* ── PageHeader ── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', animation: 'fadeUp 0.4s ease both' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ marginTop: 6, color: 'var(--text-2)', fontSize: 14 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

/* ── Table ── */
export function Table({ cols, rows, emptyMsg = 'No data found', loading }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={cols.length} style={{ padding: 32, textAlign: 'center' }}><Spinner /></td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>{emptyMsg}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {cols.map(c => (
                <td key={c.key} style={{ padding: '12px 14px', color: 'var(--text-2)', verticalAlign: 'middle' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', animation: 'fadeUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text-2)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── FormGroup ── */
export function FormGroup({ label, children, error, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

/* ── ConfidenceBar ── */
export function ConfidenceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--navy-4)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({ icon, title, message, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 14, textAlign: 'center' }}>
      <span style={{ fontSize: 48, opacity: 0.3 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 340 }}>{message}</div>
      </div>
      {action}
    </div>
  );
}

/* ── SearchInput ── */
export function SearchInput({ value, onChange, placeholder = 'Search...', style = {} }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 32, paddingRight: 12 }} />
    </div>
  );
}