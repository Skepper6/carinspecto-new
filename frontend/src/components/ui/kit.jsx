import { Children, Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Star, Inbox, Check, X as XIcon, Minus, Filter, ChevronDown, CalendarDays } from 'lucide-react';
import Calendar from './Calendar';
import { STATUS } from '../../lib/constants';
import { initials, fmtPhone, isoDate, PHONE_HINT, PHONE_PLACEHOLDER } from '../../lib/format';
import Button from './Button';

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

const HUES = ['#3a2a8c', '#b84d00', '#18766f', '#c2410c', '#6d28d9', '#0e7490', '#be185d'];
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

export const SearchInput = ({ value, onChange, placeholder = 'Search' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <label className="search">
      <Search size={16} />
      <input ref={ref} type="search" name="table-search" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />   {/* never auto-filled by the browser: a filled-in email would hide every row */}
      <kbd className="search-kbd">Ctrl + J</kbd>
    </label>
  );
};

export const Field = ({ label, hint, error, children, className = '', htmlFor }) => (
  <div className={`field ${error ? 'has-error' : ''} ${className}`}>
    {label && (htmlFor ? <label className="field-label" htmlFor={htmlFor}>{label}</label> : <span className="field-label">{label}</span>)}
    {children}
    {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
  </div>
);
export const Input = ({ label, hint, error, className, id, end, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={i}>
      {end ? <div className="input-wrap"><input id={i} className="input" {...p} />{end}</div> : <input id={i} className="input" {...p} />}
    </Field>
  );
};

// Dropdown with the same look as DateField's calendar popup, in every browser (replaces native <select>).
// Same API as <select>: value, onChange(e) with e.target.value, <option> children, className, disabled, id, aria-label.
const flatOptions = (children) => {
  const out = [];
  const walk = (nodes) => Children.forEach(nodes, (c) => {
    if (!c || typeof c !== 'object') return;
    if (c.type === Fragment) walk(c.props.children);
    else if (c.type === 'option') {
      const label = Children.toArray(c.props.children).join('');
      out.push({ value: String(c.props.value ?? label), label, disabled: !!c.props.disabled });
    }
  });
  walk(children);
  return out;
};
export const SelectBox = ({ value, onChange, children, className = 'input', disabled, id, name, ...rest }) => {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState({ left: 8, top: 8, w: 200 });
  const btn = useRef(null);
  const pop = useRef(null);
  const opts = flatOptions(children);
  const cur = opts.find((o) => o.value === String(value ?? ''));
  const empty = !cur || cur.value === '';
  const label = cur?.label ?? opts.find((o) => o.value === '')?.label ?? '';
  const place = () => {
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, 180), window.innerWidth - 16);
    const h = Math.min(opts.length * 40 + 12, 280);
    const below = window.innerHeight - r.bottom;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: below >= h + 12 || below >= r.top ? r.bottom + 6 : Math.max(8, r.top - h - 6), w });
  };
  const show = () => { if (disabled) return; place(); setHi(opts.findIndex((o) => o.value === String(value ?? ''))); setOpen(true); };
  const choose = (o) => { if (o.disabled) return; onChange?.({ target: { value: o.value, name } }); setOpen(false); btn.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const away = (e) => { if (!pop.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('touchstart', out);
    window.addEventListener('scroll', away, true); window.addEventListener('resize', away);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('touchstart', out); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [open]);
  useEffect(() => { if (open && hi >= 0) pop.current?.querySelector('[data-hi="true"]')?.scrollIntoView({ block: 'nearest' }); }, [open, hi]);
  const key = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(opts.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts[hi]) choose(opts[hi]); }
  };
  const stop = (e) => e.stopPropagation();
  return (
    <>
      <button type="button" ref={btn} id={id} disabled={disabled} className={`${className} selbtn ${open ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label={rest['aria-label']} onClick={() => (open ? setOpen(false) : show())} onKeyDown={key}>
        <span className={empty ? 'ph' : ''}>{label}</span><ChevronDown size={16} />
      </button>
      {open && createPortal(
        <ul ref={pop} className="selbox-pop" role="listbox" style={{ left: pos.left, top: pos.top, width: pos.w }} onMouseDown={stop} onTouchStart={stop}>
          {opts.map((o, i) => (
            <li key={o.value + i} role="option" aria-selected={o.value === String(value ?? '')} aria-disabled={o.disabled || undefined} data-hi={i === hi} className={`${o.value === String(value ?? '') ? 'sel' : ''} ${i === hi ? 'hi' : ''} ${o.value === '' ? 'ph' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>
              <span>{o.label}</span>{o.value === String(value ?? '') && <Check size={14} />}
            </li>
          ))}
        </ul>, document.body)}
    </>
  );
};
export const Select = ({ label, hint, error, options, placeholder, className, id, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={i}>
      <SelectBox id={i} className="input" {...p}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
      </SelectBox>
    </Field>
  );
};
export const Textarea = ({ label, hint, error, className, id, ...p }) => {
  const uid = useId(); const i = id ?? uid;
  return <Field label={label} hint={hint} error={error} className={className} htmlFor={i}><textarea id={i} className="input" rows={4} {...p} /></Field>;
};

export const Tabs = ({ tabs, value, onChange }) => {
  const opts = tabs.map((t) => (typeof t === 'string' ? { value: t, label: t } : t));
  return (
    <>
      <div className="tabs" role="tablist">
        {opts.map((o) => (
          <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
            {o.label}{o.count != null && <em>{o.count}</em>}
          </button>
        ))}
      </div>
      <SelectBox className="input tabs-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Choose a view">
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.count != null ? `${o.label} (${o.count})` : o.label}</option>
        ))}
      </SelectBox>
    </>
  );
};

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

// Clickable when onChange is given: the stars up to the pointer light up before you click, so it is clear what you will give.
export const Stars = ({ value = 0, onChange, size = 18 }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className={`stars ${onChange ? 'rate' : ''}`} role={onChange ? 'radiogroup' : 'img'} aria-label={onChange ? 'Rate from 1 to 5 stars' : `${value} out of 5 stars`} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} onMouseEnter={() => onChange && setHover(n)} onFocus={() => onChange && setHover(n)} onBlur={() => setHover(0)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`} title={onChange ? `${n} / 5` : undefined} className={n <= shown ? 'on' : ''}>
          <Star size={size} fill={n <= shown ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      ))}
    </span>
  );
};

export const ScoreRing = ({ score, size = 112, label }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? '#16945a' : score >= 78 ? '#3a2a8c' : score >= 62 ? '#f58220' : '#d23434';
  const v = useCountUp(score, 900);
  return (
    <div className="ring" style={{ width: size, height: size, '--ring': `${size}px` }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} stroke={color} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="ring-text"><b>{Math.round(v)}</b><span>{label ?? '/ 100'}</span></div>
    </div>
  );
};

// Every step is blue; only the final step of a completed booking is green (a cancelled booking ends red).
export const Timeline = ({ items, status }) => (
  <ol className="timeline">
    {items.map((t, i) => (
      <li key={i} className={i === items.length - 1 ? `last ${status === 'completed' ? 'done' : status === 'cancelled' ? 'cancelled' : ''}` : ''}>
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


// Date field with our own calendar popup, so it looks and behaves the same in Chrome, Edge, Safari, iOS and Android
// (native <input type="date"> renders blank or misaligned in Safari). Value is an ISO yyyy-mm-dd string.
export const DateField = ({ value, onChange, min = '2000-01-01', max = '2100-12-31', placeholder = 'Select date', label, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 8, top: 8 });
  const btn = useRef(null);
  const pop = useRef(null);
  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const w = Math.min(330, window.innerWidth - 16);
      const below = window.innerHeight - r.bottom;
      setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: below >= 400 || below >= r.top ? r.bottom + 6 : Math.max(8, r.top - 396), w });
    }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    const away = (e) => { if (!pop.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('touchstart', out); document.addEventListener('keydown', esc);
    window.addEventListener('scroll', away, true); window.addEventListener('resize', away);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('touchstart', out); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [open]);
  const shown = value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const stop = (e) => e.stopPropagation();
  return (
    <>
      <button type="button" ref={btn} className={`input datef ${open ? 'open' : ''} ${className}`} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <CalendarDays size={16} /><span className={shown ? '' : 'ph'}>{shown || placeholder}</span>
      </button>
      {open && createPortal(
        <div ref={pop} className="datef-pop" role="dialog" aria-label={label || 'Choose a date'} style={{ left: pos.left, top: pos.top, width: pos.w }} onMouseDown={stop} onTouchStart={stop}>
          <Calendar value={value} min={min} max={max} onChange={(d) => { onChange(d); setOpen(false); }} />
          <div className="datef-foot">
            <button type="button" className="link-btn" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
            <button type="button" className="link-btn" onClick={() => { const t = isoDate(); if (t >= min && t <= max) { onChange(t); setOpen(false); } }}>Today</button>
          </div>
        </div>, document.body)}
    </>
  );
};

// ---- list filters ----
// Dropdowns/date pickers edit a local draft so picking a value never re-filters mid-click;
// the draft is only committed (and the list actually filtered) once Apply is pressed.
export function useFilters() {
  const [f, setF] = useState({});
  const [draft, setDraft] = useState({});
  const set = (k, v) => setDraft((x) => ({ ...x, [k]: v }));
  const apply = () => setF(draft);
  const reset = () => { setDraft({}); setF({}); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(f);
  return { f, draft, set, apply, reset, dirty, key: JSON.stringify(f) };
}
export const inRange = (iso, f) => { const d = (iso || '').slice(0, 10); return (!f.from || d >= f.from) && (!f.to || d <= f.to); };

// Custom select for the filter popover – a styled trigger + animated list, no native <select> chrome.
const FilterSelect = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const opts = useMemo(() => options.map((o) => (typeof o === 'object' ? o : { value: o, label: o })), [options]);
  const current = opts.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const pick = (v) => { onChange(v); setOpen(false); };
  return (
    <div className={`fselect ${open ? 'open' : ''}`} ref={ref}>
      <button type="button" className="fselect-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={current ? '' : 'ph'}>{current?.label ?? placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <ul className="fselect-pop" role="listbox">
          <li role="option" aria-selected={!value} className={!value ? 'sel' : ''} onClick={() => pick('')}>{placeholder}</li>
          {opts.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={o.value === value ? 'sel' : ''} onClick={() => pick(o.value)}>
              <span>{o.label}</span>{o.value === value && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// defs: { key, label, type?: 'select' | 'date', options: string[] | { value, label }[] }
// Filters live behind a funnel-icon popover: picking values only edits a draft, Apply commits it.
export const FilterBar = ({ defs: given, flt }) => {
  // From / To dates only show once "Custom dates" is chosen (same behaviour on every page)
  const defs = useMemo(() => {
    const out = [];
    let added = false;
    given.forEach((d) => {
      if (d.type === 'date' && !d.showIf) {
        if (!added) { out.push({ key: 'range', label: 'Any date', options: [{ value: 'custom', label: 'Custom dates' }], isRange: true }); added = true; }
        out.push({ ...d, auto: true, showIf: (v) => v.range === 'custom' });
      } else out.push(d);
    });
    return out;
  }, [given]);
  const shown = (d, v) => !d.showIf || d.showIf(v);
  const active = defs.filter((d) => !d.auto && (d.isRange ? flt.f.range === 'custom' && (flt.f.from || flt.f.to) : shown(d, flt.f) && flt.f[d.key])).length;
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const ref = useRef(null);
  const popRef = useRef(null);
  // keep the popover fully on screen whichever side of the page its funnel button sits
  useLayoutEffect(() => {
    if (!open) { setShift(0); return; }
    const r = popRef.current?.getBoundingClientRect();
    if (!r) return;
    setShift(r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0);
  }, [open]);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const apply = () => { flt.apply(); setOpen(false); };
  return (
    <div className="fbar" ref={ref}>
      <button type="button" className={`icon-btn fbar-trigger ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Filters" aria-expanded={open} title="Filters">
        <Filter size={18} />
        {active > 0 && <i className="nav-badge">{active}</i>}
      </button>
      {open && (
        <div className="fbar-pop" ref={popRef} style={shift ? { right: -shift } : undefined}>
          <div className="fbar-pop-grid">
            {defs.filter((d) => shown(d, flt.draft)).map((d) => (d.type === 'date' ? (
              <div key={d.key} className="fdate"><span>{d.label}</span><DateField label={d.label} className="sm" value={flt.draft[d.key] || ''} onChange={(v) => flt.set(d.key, v)} /></div>
            ) : (
              <FilterSelect key={d.key} value={flt.draft[d.key] || ''} onChange={(v) => { flt.set(d.key, v); if (d.isRange && !v) { flt.set('from', ''); flt.set('to', ''); } }} options={d.options} placeholder={d.label} />
            )))}
          </div>
          <div className="fbar-pop-foot">
            {active > 0 ? <button type="button" className="link-btn" onClick={flt.reset}>Clear filters ({active})</button> : <span />}
            <Button size="sm" disabled={!flt.dirty} onClick={apply}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// onChange receives the formatted string (not the event)
export const PhoneInput = ({ onChange, value, ...p }) => (
  <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={17} placeholder={PHONE_PLACEHOLDER} hint={PHONE_HINT} {...p} value={value ?? ''} onChange={(e) => onChange(fmtPhone(e.target.value))} />
);
