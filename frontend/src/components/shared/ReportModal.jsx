import { useEffect, useState } from 'react';
import { Download, Check, X as XIcon, ChevronDown, Share2, FileSearch, Camera } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Badge, ScoreRing, EmptyState } from '../ui/kit';
import { useDB, fullInspection } from '../../lib/db';
import { useUI } from '../../context/UIContext';
import { sectionsForPlan, itemTotals, verdict, gradeItem, isAnswered, DEFECTS } from '../../lib/inspectionSchema';
import { downloadReport } from '../../lib/pdf';
import { carName, fmtDate, fmtTime } from '../../lib/format';

export function ValueCell({ item, cell }) {
  if (!isAnswered(cell)) return <span className="muted">—</span>;
  const g = gradeItem(item, cell);
  const v = cell.v;
  if (item.type === 'pf') return v === 'pass' ? <Badge tone="green"><Check size={12} /> Pass</Badge> : v === 'fail' ? <Badge tone="red"><XIcon size={12} /> Defect</Badge> : <Badge>N/A</Badge>;
  if (item.type === 'multi') return v.length ? <Badge raw tone="red">{v.join(', ')}</Badge> : <Badge tone="green"><Check size={12} /> None</Badge>;
  if (item.type === 'panel') {
    const d = (cell.defects ?? []).map((c) => DEFECTS.find((x) => x[0] === c)?.[1]).filter(Boolean);
    return <Badge raw tone={g === 'pass' ? 'green' : 'red'}>{v}{d.length ? ` · ${d.join(', ')}` : ''}{cell.micron ? ` · ${cell.micron}µm` : ''}</Badge>;
  }
  if (item.type === 'select') return <Badge raw tone={g === 'pass' ? 'green' : g === 'fail' ? 'red' : 'gray'}>{v === 'Other' && cell.other ? cell.other : v}</Badge>;
  return <b>{String(v)}</b>;
}

export default function ReportModal({ bookingId, onClose }) {
  const data = useDB((s) => {
    const booking = s.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    return {
      booking, inspection: s.inspections[bookingId], plan: s.plans.find((p) => p.id === booking.planId),
      customer: s.users.find((u) => u.id === booking.customerId), inspector: s.users.find((u) => u.id === booking.inspectorId),
    };
  });
  const { toast } = useUI();
  const [open, setOpen] = useState({ 0: true });
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);

  useEffect(() => { if (bookingId) fullInspection(bookingId).catch(() => {}); }, [bookingId]);   // photos are loaded on demand

  const download = async () => {
    setBusy(true);
    try { const inspection = await fullInspection(bookingId); await downloadReport({ ...data, inspection: inspection ?? data.inspection }); toast.success('Report downloaded.', 'PDF ready'); }
    catch (e) { console.error(e); toast.error('Could not generate the PDF.'); }
    finally { setBusy(false); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/app/reports?report=${bookingId}`); toast.success('Report link copied to clipboard.'); }
    catch { toast.info('Copy not available in this browser.'); }
  };

  const ready = data?.inspection;
  const totals = ready ? itemTotals(data.plan, data.inspection.data) : null;
  const v = totals ? verdict(totals.score) : null;
  const cover = ready ? (data.inspection.photos.find((p) => p.category === 'Cover') ?? data.inspection.photos[0]) : null;

  return (
    <Modal open={!!bookingId} onClose={onClose} size="lg" title={data ? `Inspection report · ${data.booking.id}` : 'Report'}
      subtitle={data ? `${carName(data.booking.car)} · ${fmtDate(data.booking.date)} ${fmtTime(data.booking.time)}` : ''}
      footer={ready && (
        <>
          <Button variant="ghost" icon={Share2} onClick={share}>Copy link</Button>
          <Button icon={Download} loading={busy} onClick={download}>Download PDF</Button>
        </>
      )}>
      {!data ? null : !ready ? (
        <EmptyState icon={FileSearch} title="Report not available yet" text="The report is generated as soon as the inspector completes the inspection." />
      ) : (
        <div className="report">
          <div className="report-top">
            {cover ? <img className="report-cover" src={cover.src} alt="Vehicle" /> : <ScoreRing score={totals.score} size={124} label="health score" />}
            <div className="report-sum">
              <Badge tone={v.tone}>{v.label} · {totals.score}/100</Badge>
              <h3>{carName(data.booking.car)}</h3>
              <p className="muted">{v.text}</p>
              <div className="mini-stats">
                <span><b className="ok">{totals.pass}</b> pass</span>
                <span><b className="bad">{totals.fail}</b> defects</span>
                <span><b>{totals.na}</b> N/A</span>
                <span><b>{data.plan.name}</b> plan</span>
              </div>
            </div>
            <dl className="kv">
              <div><dt>Registration</dt><dd>{data.booking.car.reg}</dd></div>
              <div><dt>Inspector</dt><dd>{data.inspector?.name ?? '—'}</dd></div>
              <div><dt>Location</dt><dd>{data.booking.location.city}</dd></div>
            </dl>
          </div>

          {sectionsForPlan(data.plan).map((s, i) => {
            const cells = data.inspection.data[s.id] ?? {};
            const fails = s.items.filter((it) => gradeItem(it, cells[it.id]) === 'fail').length;
            let lastKey = '';
            return (
              <div key={s.id} className={`acc ${open[i] ? 'open' : ''}`}>
                <button onClick={() => setOpen({ ...open, [i]: !open[i] })}>
                  <b>{s.title}</b>
                  {fails ? <Badge tone="red">{fails} defect{fails > 1 ? 's' : ''}</Badge> : <Badge tone="green">All good</Badge>}
                  <ChevronDown size={18} />
                </button>
                <div className="acc-panel"><div>
                  {s.items.filter((it) => isAnswered(cells[it.id])).map((it) => {
                    const key = `${it.sub ?? ''}|${it.group ?? ''}`;
                    const head = key !== lastKey && (it.sub || it.group) ? `${it.sub ?? ''}${it.sub && it.group ? ' · ' : ''}${it.group ?? ''}` : null;
                    lastKey = key;
                    const c = cells[it.id];
                    return (
                      <div key={it.id}>
                        {head && <div className="acc-sub">{head}</div>}
                        <div className="acc-row">
                          <span>{it.label}</span>
                          <ValueCell item={it} cell={c} />
                        </div>
                        {(c.note || c.photos?.length > 0) && (
                          <div className="acc-extra">
                            {c.note && <p>{c.note}</p>}
                            {c.photos?.length > 0 && <div className="thumbs">{c.photos.map((p, k) => <button key={k} onClick={() => setZoom({ src: p, category: it.label })}><img src={p} alt="" /></button>)}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div></div>
              </div>
            );
          })}

          {data.inspection.photos.length > 0 && (
            <>
              <h4 className="mt"><Camera size={16} /> Photos</h4>
              <div className="photo-grid">
                {data.inspection.photos.map((p) => (
                  <button key={p.id} className="photo" onClick={() => setZoom(p)}>
                    <img src={p.src} alt={p.category} /><span>{p.category}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <h4 className="mt">Inspector comment</h4>
          <p className="comment">{data.inspection.comment || 'No additional comments.'}</p>
        </div>
      )}
      <Modal open={!!zoom} onClose={() => setZoom(null)} size="lg" title={zoom?.category}>
        {zoom && <img className="zoom-img" src={zoom.src} alt={zoom.category} />}
      </Modal>
    </Modal>
  );
}
