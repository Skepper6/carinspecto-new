import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isoDate, addDays } from '../../lib/format';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Month grid date-picker. `min`/`max` are ISO strings. `marks` optionally dots days (e.g. ISO -> count).
export default function Calendar({ value, onChange, min = isoDate(), max = isoDate(addDays(new Date(), 60)), marks = {} }) {
  const base = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const today = isoDate();
  const canPrev = isoDate(new Date(y, m, 0)) >= min;
  const canNext = isoDate(new Date(y, m + 1, 1)) <= max;

  return (
    <div className="cal">
      <header>
        <button type="button" disabled={!canPrev} onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <b key={`${y}-${m}`}>{view.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</b>
        <button type="button" disabled={!canNext} onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
      </header>
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
    </div>
  );
}
