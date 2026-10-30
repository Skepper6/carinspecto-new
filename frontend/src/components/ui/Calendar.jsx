import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { isoDate, addDays } from '../../lib/format';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Month grid date-picker. `min`/`max` are ISO strings. `marks` optionally dots days (e.g. ISO -> count).
// Click the month / year title to jump straight to any year and month.
export default function Calendar({ value, onChange, min = isoDate(), max = isoDate(addDays(new Date(), 60)), marks = {}, monthOnly = false }) {   // monthOnly: just pick a month + year (value/onChange are the 1st of that month)
  const base = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [pickOpen, setPick] = useState(false);
  const pick = monthOnly || pickOpen;
  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const today = isoDate();
  const canPrev = isoDate(new Date(y, m, 0)) >= min;
  const canNext = isoDate(new Date(y, m + 1, 1)) <= max;

  const minY = Number(min.slice(0, 4));
  const maxY = Number(max.slice(0, 4));
  const years = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
  const monthOff = (yy, mm) => isoDate(new Date(yy, mm + 1, 0)) < min || isoDate(new Date(yy, mm, 1)) > max;
  const yearsRef = useRef(null);
  useEffect(() => { if (pick) yearsRef.current?.querySelector('.on')?.scrollIntoView({ block: 'center' }); }, [pick]);
  // moving to another year keeps the month if it is allowed, otherwise the closest allowed one
  const goYear = (yy) => {
    let mm = m;
    while (mm < 11 && isoDate(new Date(yy, mm + 1, 0)) < min) mm += 1;
    while (mm > 0 && isoDate(new Date(yy, mm, 1)) > max) mm -= 1;
    setView(new Date(yy, mm, 1));
  };

  return (
    <div className="cal">
      <header>
        <button type="button" disabled={pick || !canPrev} onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <button type="button" className={`cal-title ${pick ? 'open' : ''}`} onClick={() => setPick((p) => !p)} aria-expanded={pick} aria-label="Choose month and year">
          <b key={`${y}-${m}`}>{view.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</b><ChevronDown size={15} />
        </button>
        <button type="button" disabled={pick || !canNext} onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
      </header>
      {pick ? (
        <div className="cal-pick">
          <ul className="cal-years" ref={yearsRef} role="listbox" aria-label="Year">
            {years.map((yy) => (
              <li key={yy}><button type="button" role="option" aria-selected={yy === y} className={yy === y ? 'on' : ''} onClick={() => goYear(yy)}>{yy}</button></li>
            ))}
          </ul>
          <div className="cal-months" role="listbox" aria-label="Month">
            {MONTHS.map((mn, i) => (
              <button key={mn} type="button" role="option" aria-selected={i === m} disabled={monthOff(y, i)} className={i === m && (!monthOnly || value?.slice(0, 7) === `${y}-${String(i + 1).padStart(2, '0')}`) ? 'on' : ''} onClick={() => { setView(new Date(y, i, 1)); setPick(false); if (monthOnly) onChange(isoDate(new Date(y, i, 1))); }}>{mn}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="cal-grid">
          {DAYS.map((d) => <span key={d} className="dow">{d}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const iso = isoDate(new Date(y, m, d));
            const off = iso < min || iso > max;
            return (
              <button key={iso} type="button" disabled={off} onClick={() => onChange(iso)}
                className={`${iso === value ? 'sel' : ''} ${iso === today ? 'today' : ''}`}>
                {d}{marks[iso] ? <i /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
