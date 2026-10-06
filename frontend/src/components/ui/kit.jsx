import { useEffect, useId, useRef, useState } from 'react';
import { Search, Star, Inbox, Check, X as XIcon, Minus } from 'lucide-react';
import { STATUS } from '../../lib/constants';
import { initials, fmtPhone } from '../../lib/format';

export const Logo = ({ height = 38 }) => <img src="/logo.png" alt="Car InspectO" className="logo-img" style={{ height }} />;

export const Badge = ({ tone = 'gray', children, dot, raw }) => (
  <span className={`badge badge-${tone} ${raw ? 'raw' : ''}`}>{dot && <i className="dot" />}{children}</span>
);

export const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? { label: status, tone: 'gray' };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
};

export const PayBadge = ({ status }) => (
  <Badge tone={status === 'paid' ? 'green' : status === 'refunded' ? 'red' : 'amber'}>{status}</Badge>
);

const HUES = ['#3a2a8c', '#f58220', '#2ea6a0', '#c2410c', '#6d28d9', '#0e7490', '#be185d'];
export const Avatar = ({ name = '?', size = 36 }) => {
  const c = HUES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];
  return <span className="avatar" style={{ width: size, height: size, background: c, fontSize: size * 0.38 }}>{initials(name)}</span>;
};

export const Card = ({ title, action, children, className = '', pad = true }) => (
  <section className={`card ${className}`}>
    {(title || action) && (
      <header className="card-head"><h3>{title}</h3>{action}</header>
    )}
    <div className={pad ? 'card-body' : ''}>{children}</div>
  </section>
);

export function useCountUp(target, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export const StatCard = ({ icon: Icon, label, value, format = (n) => Math.round(n).toLocaleString('en-GB'), tone = 'indigo', hint, trend }) => {
  const v = useCountUp(Number(value) || 0);
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-icon"><Icon size={20} /></span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{format(v)}</p>
        {hint && <p className="stat-hint">{trend != null && <b className={trend >= 0 ? 'up' : 'down'}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</b>} {hint}</p>}
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <label className="search">
    <Search size={16} />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </label>
);

export const Field = ({ label, hint, error, children, className = '', htmlFor }) => (
  <div className={`field ${error ? 'has-error' : ''} ${className}`}>
    {label && (htmlFor ? <label className="field-label" htmlFor={htmlFor}>{label}</label> : <span className="field-label">{label}</span>)}
    {children}
    {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
  </div>
);
export const Input = ({ label, hint, error, className, id, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return <Field label={label} hint={hint} error={error} className={className} htmlFor={i}><input id={i} className="input" {...p} /></Field>;
};
export const Select = ({ label, hint, error, options, placeholder, className, id, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={i}>
      <select id={i} className="input" {...p}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
      </select>
    </Field>
  );
};
export const Textarea = ({ label, hint, error, className, id, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return <Field label={label} hint={hint} error={error} className={className} htmlFor={i}><textarea id={i} className="input" rows={4} {...p} /></Field>;
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs" role="tablist">
    {tabs.map((t) => {
      const o = typeof t === 'string' ? { value: t, label: t } : t;
      return (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <em>{o.count}</em>}
        </button>
      );
    })}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, text, action }) => (
  <div className="empty">
    <span className="empty-icon"><Icon size={28} /></span>
    <h4>{title}</h4>
    {text && <p className="muted">{text}</p>}
    {action}
  </div>
);

export const Skeleton = ({ h = 16, w = '100%', r = 8, className = '' }) => (
  <i className={`skeleton ${className}`} style={{ height: h, width: w, borderRadius: r }} />
);

export const Stars = ({ value = 0, onChange, size = 18 }) => (
  <span className="stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} stars`} className={n <= value ? 'on' : ''}>
        <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
      </button>
    ))}
  </span>
);

export const ScoreRing = ({ score, size = 112, label }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? '#16945a' : score >= 78 ? '#3a2a8c' : score >= 62 ? '#f58220' : '#d23434';
  const v = useCountUp(score, 900);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} stroke={color} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="ring-text"><b>{Math.round(v)}</b><span>{label ?? '/ 100'}</span></div>
    </div>
  );
};

export const Timeline = ({ items }) => (
  <ol className="timeline">
    {items.map((t, i) => (
      <li key={i} className={i === items.length - 1 ? 'last' : ''}>
        <i />
        <div>
          <strong>{t.label}</strong>
          <span className="muted small">{new Date(t.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {t.by}</span>
        </div>
      </li>
    ))}
  </ol>
);

// Pass / Fail / N-A segmented toggle
export const PassFail = ({ value, onChange }) => (
  <div className="pf" role="radiogroup">
    {[['pass', 'Pass', Check], ['fail', 'Fail', XIcon], ['na', 'N/A', Minus]].map(([v, l, I]) => (
      <button key={v} type="button" role="radio" aria-checked={value === v} className={`pf-${v} ${value === v ? 'on' : ''}`} onClick={() => onChange(value === v ? undefined : v)}>
        <I size={14} />{l}
      </button>
    ))}
  </div>
);

export function useLoading(ms = 550) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), ms); return () => clearTimeout(t); }, [ms]);
  return loading;
}

export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export const Reveal = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
  const ref = useReveal();
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
};

// 8:00 AM -> big time + small meridiem
export const Tm = ({ t }) => {
  const [h, m] = t.split(':').map(Number);
  return <span className="tm">{`${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`}<small>{h >= 12 ? 'PM' : 'AM'}</small></span>;
};

// ---- list filters ----
export function useFilters() {
  const [f, setF] = useState({});
  return { f, set: (k, v) => setF((x) => ({ ...x, [k]: v })), reset: () => setF({}), key: JSON.stringify(f) };
}
export const inRange = (iso, f) => { const d = (iso || '').slice(0, 10); return (!f.from || d >= f.from) && (!f.to || d <= f.to); };
// defs: { key, label, type?: 'select' | 'date', options: string[] | { value, label }[] }
export const FilterBar = ({ defs, flt }) => {
  const active = defs.filter((d) => flt.f[d.key]).length;
  return (
    <div className="fbar">
      {defs.map((d) => (d.type === 'date' ? (
        <label key={d.key} className="fdate"><span>{d.label}</span><input type="date" className="input sm" value={flt.f[d.key] || ''} onChange={(e) => flt.set(d.key, e.target.value)} /></label>
      ) : (
        <select key={d.key} className="input sm" aria-label={d.label} value={flt.f[d.key] || ''} onChange={(e) => flt.set(d.key, e.target.value)}>
          <option value="">{d.label}</option>
          {d.options.map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
        </select>
      )))}
      {active > 0 && <button type="button" className="link-btn" onClick={flt.reset}>Clear filters ({active})</button>}
    </div>
  );
};

// onChange receives the formatted string (not the event)
export const PhoneInput = ({ onChange, value, ...p }) => (
  <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={17} placeholder="+971 50 123 4567" hint="UAE mobile – 9 digits after +971" {...p} value={value ?? ''} onChange={(e) => onChange(fmtPhone(e.target.value))} />
);
