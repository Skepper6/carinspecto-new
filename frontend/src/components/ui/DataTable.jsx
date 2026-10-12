import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, SearchX } from 'lucide-react';
import { Skeleton } from './kit';

const HEAD_H = 44;
const PHONE = '(max-width: 640px)';
const CARD_PAGE = 6;   // on phones rows become stacked cards and the page scrolls, so the page size is fixed

function usePhone() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const fn = () => setOn(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return on;
}

/**
 * Viewport-fitted table. The page size is derived from the height available to the table card, so rows
 * never push the page past the screen. The pager lives *outside* (below) the table card.
 * The parent must be a flex column with a bounded height (`.page.fill`).
 */
export default function DataTable({ columns, rows, rowHeight = 64, onRowClick, rowClass, loading, empty, rowKey = (r) => r.id, resetKey }) {
  const cardRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(null);
  const phone = usePhone();

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const pageSize = phone ? CARD_PAGE : Math.max(3, Math.floor((height - HEAD_H - 6) / rowHeight));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = get(a); const y = get(b);
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { setPage((p) => Math.min(p, pages)); }, [pages]);
  useEffect(() => { setPage(1); }, [resetKey]);

  const start = (page - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  const toggleSort = (c) => {
    if (c.sortable === false) return;
    setSort((s) => (s?.key !== c.key ? { key: c.key, dir: 'asc' } : s.dir === 'asc' ? { key: c.key, dir: 'desc' } : null));
    setPage(1);
  };

  const nums = useMemo(() => {
    const out = [];
    const add = (n) => out.push(n);
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) add(i);
      else if (out[out.length - 1] !== '…') add('…');
    }
    return out;
  }, [pages, page]);

  return (
    <div className="dt">
      <div className="dt-card" ref={cardRef} style={{ '--row-h': `${rowHeight}px`, minHeight: HEAD_H + rowHeight * 3 + 6 }}>
        <div className="dt-scroll">
          <table className="table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ width: c.width, textAlign: c.align }} className={`${c.sortable === false ? '' : 'sortable'} ${c.hide ? 'hide-' + c.hide : ''}`} onClick={() => toggleSort(c)}>
                    <span>{c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody key={page + (sort?.key ?? '') + (sort?.dir ?? '')}>
              {loading
                ? Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>{columns.map((c) => <td key={c.key} data-label={c.label} className={c.hide ? 'hide-' + c.hide : ''}><Skeleton h={14} w={c.skel ?? '70%'} /></td>)}</tr>
                ))
                : slice.map((r, i) => (
                  <tr key={rowKey(r)} className={`${onRowClick ? 'clickable' : ''} ${rowClass?.(r) ?? ''}`} style={{ animationDelay: `${i * 22}ms` }} onClick={() => onRowClick?.(r)}>
                    {columns.map((c) => <td key={c.key} data-label={c.label} className={c.hide ? 'hide-' + c.hide : ''} style={{ textAlign: c.align }}>{c.render ? c.render(r) : r[c.key]}</td>)}
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && slice.length === 0 && (
            <div className="dt-empty">
              {empty ?? (<><SearchX size={30} /><b>No results</b><span className="muted">Try changing your search or filters.</span></>)}
            </div>
          )}
        </div>
      </div>

      <nav className="pager" aria-label="Pagination">
        <span className="muted small">
          {sorted.length ? `Showing ${start + 1}–${Math.min(start + pageSize, sorted.length)} of ${sorted.length}` : '0 results'}
        </span>
        <div className="pager-btns">
          <button disabled={page === 1} onClick={() => setPage(1)} aria-label="First page"><ChevronsLeft size={16} /></button>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
          {nums.map((n, i) => (n === '…' ? <span key={`e${i}`} className="pager-gap">…</span> : (
            <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
          )))}
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          <button disabled={page === pages} onClick={() => setPage(pages)} aria-label="Last page"><ChevronsRight size={16} /></button>
        </div>
      </nav>
    </div>
  );
}
