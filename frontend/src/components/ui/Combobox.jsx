import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Field } from './kit';

// Searchable single-select. options: string[] | { value, label, hint }[]
export default function Combobox({ label, value, onChange, options, placeholder = 'Select', disabled, error, hint, className, allowCustom, emptyText = 'No matches' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const list = useRef(null);
  const id = useId();

  const opts = useMemo(() => options.map((o) => (typeof o === 'object' ? o : { value: o, label: o })), [options]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? opts.filter((o) => o.label.toLowerCase().includes(t)) : opts;
  }, [opts, q]);
  const current = opts.find((o) => o.value === value);
  const showCustom = allowCustom && q.trim() && !opts.some((o) => o.label.toLowerCase() === q.trim().toLowerCase());
  const useCustom = () => { onChange(q.trim()); setOpen(false); setQ(''); };

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  const pick = (o) => { onChange(o.value); setOpen(false); setQ(''); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (shown[active]) pick(shown[active]); else if (showCustom) useCustom(); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <div className={`combo ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`} ref={root}>
        <button type="button" className="input combo-btn" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}>
          <span className={current || (allowCustom && value) ? '' : 'ph'}>{current?.label ?? (allowCustom && value ? value : placeholder)}</span>
          <ChevronDown size={16} />
        </button>
        {open && (
          <div className="combo-pop" role="listbox" id={id}>
            <label className="combo-search"><Search size={15} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={`Type to search ${(label || "").toLowerCase().replace(/ \(optional\)/, "")}…`} /></label>
            <ul ref={list}>
              {shown.length === 0 && !showCustom && <li className="combo-empty">{emptyText}</li>}
              {shown.map((o, i) => (
                <li key={o.value} role="option" aria-selected={o.value === value} data-active={i === active} className={`${o.value === value ? 'sel' : ''} ${i === active ? 'act' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
                  <span>{o.label}</span>{o.hint && <em>{o.hint}</em>}{o.value === value && <Check size={15} />}
                </li>
              ))}
              {showCustom && <li className="combo-custom" role="option" onClick={useCustom}><span>Use “{q.trim()}”</span><em>Other – not in the list</em></li>}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}
