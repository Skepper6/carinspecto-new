import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Car, CircleDot, Cog, Settings2, Activity, Camera, ClipboardCheck, ArrowLeft, ArrowRight, Save, Flag, Upload, Trash2, Check, AlertCircle, Cloud,
  Armchair, Zap, PaintBucket, Layers, ShieldCheck, Star, CheckCheck, ImagePlus, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, saveInspection, startInspection, completeInspection, useFullInspection } from '../../lib/db';
import {
  sectionsForPlan, itemTotals, verdict, gradeItem, isAnswered, isGradedType, missingItems, passAllValues, PAINT_STATES, DEFECTS, findingLabel,
} from '../../lib/inspectionSchema';
import { PHOTO_CATEGORIES, COVER } from '../../lib/constants';
import { compressImage, checkUpload, PHOTO_ACCEPT, DOC_ACCEPT } from '../../lib/image';
import { carName, fmtDate, fmtTime, uid } from '../../lib/format';
import { SelectBox, Badge, EmptyState, PassFail, ScoreRing, StatusBadge, Textarea } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PlateMaskModal from '../../components/shared/PlateMaskModal';

const ICONS = { Car, CircleDot, Cog, Settings2, Activity, Armchair, Zap, PaintBucket, Layers };

// photos that can show a number plate: the plate must be covered with the logo (or confirmed absent) before finishing
const PLATE_CATS = ['Cover', 'Exterior'];
const nextPlate = (list, exceptId) => list.find((p) => p.id !== exceptId && PLATE_CATS.includes(p.category) && !p.plateChecked) ?? null;
const readDataUrl = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });

// upload slot for reports (TBE test report, pre / post test drive scans): images or PDFs
function FilesRow({ item, cell, onChange, toast }) {
  const ref = useRef(null);
  const files = cell?.photos ?? [];
  const add = async (list) => {
    const out = [];
    for (const f of [...list]) {
      const problem = checkUpload(f, { pdf: true });
      if (problem) { toast.warn(problem); continue; }
      try { out.push(f.type === 'application/pdf' || /.pdf$/i.test(f.name) ? await readDataUrl(f) : await compressImage(f, 900, 0.7)); }
      catch { toast.error(`Could not read ${f.name}.`); }
    }
    if (out.length) onChange({ ...cell, photos: [...files, ...out] });
  };
  return (
    <div className="q">
      <div className="q-main">
        <span className="q-label">{item.label}</span>
        <button type="button" className="q-add" onClick={() => ref.current.click()}><Upload size={16} /> Upload PDF / image</button>
        <input ref={ref} type="file" accept={DOC_ACCEPT} multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <div className="q-extra"><div className="q-photos">
          {files.map((p, i) => (
            <span key={i} className="q-thumb">
              {p.startsWith('data:application/pdf') ? <span className="doc-chip">PDF</span> : <img src={p} alt="" />}
              <button aria-label="Remove file" onClick={() => onChange({ ...cell, photos: files.filter((_, k) => k !== i) })}><X size={12} /></button>
            </span>
          ))}
        </div></div>
      )}
    </div>
  );
}

// picked, never typed: month + year (stored as MM-YYYY, the format the report prints)
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function MonthPicker({ value, onChange }) {
  const m = /^(d{2})-(d{4})$/.exec(value ?? '');
  const [mm, setMm] = useState(m?.[1] ?? '');
  const [yy, setYy] = useState(m?.[2] ?? '');
  const now = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => String(now - i));
  const pick = (nm, ny) => { setMm(nm); setYy(ny); if (nm && ny) onChange(`${nm}-${ny}`); };
  return (
    <div className="month-pick">
      <SelectBox className="input" aria-label="Month" value={mm} onChange={(e) => pick(e.target.value, yy)}>
        <option value="">Month</option>{MONTH_NAMES.map((n, i) => <option key={n} value={String(i + 1).padStart(2, '0')}>{n}</option>)}
      </SelectBox>
      <SelectBox className="input" aria-label="Year" value={yy} onChange={(e) => pick(mm, e.target.value)}>
        <option value="">Year</option>{years.map((y) => <option key={y}>{y}</option>)}
      </SelectBox>
    </div>
  );
}

function ItemRow({ item, cell, onChange, toast }) {
  const fileRef = useRef(null);
  const set = (patch) => onChange({ ...cell, ...patch });
  const g = gradeItem(item, cell);
  const showExtras = g === 'fail' || item.type === 'panel';
  const findings = g === 'fail' && item.type !== 'panel' && item.type !== 'multi' ? item.defects : null;
  if (item.type === 'files') return <FilesRow item={item} cell={cell} onChange={onChange} toast={toast} />;

  const addPhotos = async (files) => {
    try {
      const out = [];
      for (const f of [...files]) { const problem = checkUpload(f); if (problem) { toast.warn(problem); continue; } out.push(await compressImage(f)); }
      if (out.length) set({ photos: [...(cell?.photos ?? []), ...out] });
    } catch { toast.error('Could not process that image.'); }
  };

  return (
    <div className={`q ${g === 'fail' ? 'q-fail' : ''}`}>
      <div className="q-main">
        <span className="q-label">{item.no ? <em className="q-no">{item.no}</em> : null}{item.label}</span>
        {item.type === 'pf' && <PassFail value={cell?.v} onChange={(v) => set({ v })} />}
        {item.type === 'select' && (
          <SelectBox className="input" value={cell?.v ?? ''} onChange={(e) => set({ v: e.target.value || undefined })}>
            <option value="">Select</option>{item.options.map((o) => <option key={o}>{o}</option>)}
          </SelectBox>
        )}
        {item.type === 'select' && cell?.v === 'Other' && <input className="input" autoFocus placeholder="Please specify" value={cell?.other ?? ''} onChange={(e) => set({ other: e.target.value })} style={{ gridColumn: '2' }} />}
        {item.type === 'number' && <input className="input" type="number" min="0" step="any" value={cell?.v ?? ''} onChange={(e) => set({ v: e.target.value === '' ? undefined : Number(e.target.value) })} />}
        {item.type === 'month' && <MonthPicker value={cell?.v} onChange={(v) => set({ v })} />}
        {item.type === 'text' && <input className="input" value={cell?.v ?? ''} placeholder={item.placeholder} onChange={(e) => set({ v: e.target.value })} />}
        {item.type === 'panel' && (
          <SelectBox className="input" value={cell?.v ?? ''} onChange={(e) => set({ v: e.target.value || undefined, defects: cell?.defects ?? [] })}>
            <option value="">Select</option>{PAINT_STATES.map((o) => <option key={o}>{o}</option>)}
          </SelectBox>
        )}
        {item.type === 'multi' && (
          <div className="chips tight">
            <button type="button" className={`chip ${Array.isArray(cell?.v) && cell.v.length === 0 ? 'on ok' : ''}`} onClick={() => set({ v: [] })}>None</button>
            {item.options.map((o) => {
              const on = cell?.v?.includes(o);
              return <button key={o} type="button" className={`chip ${on ? 'on bad' : ''}`} onClick={() => set({ v: on ? cell.v.filter((x) => x !== o) : [...(cell?.v ?? []), o] })}>{o}</button>;
            })}
          </div>
        )}
      </div>

      {item.type === 'panel' && cell?.v && (
        <div className="q-panel">
          <span className="muted small">Defects</span>
          <div className="chips tight">
            {DEFECTS.map(([code, name]) => {
              const on = cell.defects?.includes(code);
              return <button key={code} type="button" className={`chip ${on ? 'on bad' : ''}`} onClick={() => set({ defects: on ? cell.defects.filter((x) => x !== code) : [...(cell.defects ?? []), code] })}>{name}</button>;
            })}
          </div>
          <label className="micron"><span className="muted small">Paint µm</span><input className="input" type="number" min="0" value={cell?.micron ?? ''} onChange={(e) => set({ micron: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
        </div>
      )}

      {showExtras && (
        <div className="q-extra">
          {findings?.length > 0 && (
            <div className="q-panel">
              <span className="muted small">Findings</span>
              <div className="chips tight">
                {findings.map((fd) => {
                  const label = findingLabel(fd); const on = cell?.defects?.includes(label);
                  return <button key={label} type="button" className={`chip ${on ? 'on bad' : ''}`} onClick={() => set({ defects: on ? cell.defects.filter((x) => x !== label) : [...(cell?.defects ?? []), label] })}>{label}</button>;
                })}
              </div>
            </div>
          )}
          <input className="input q-note" placeholder={g === 'fail' ? (findings?.length ? 'Additional comments (shown in the report)…' : 'Describe the issue (shown in the report)…') : 'Notes (optional)'} value={cell?.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
          <div className="q-photos">
            {(cell?.photos ?? []).map((p, i) => (
              <span key={i} className="q-thumb"><img src={p} alt="" /><button aria-label="Remove photo" onClick={() => set({ photos: cell.photos.filter((_, k) => k !== i) })}><X size={12} /></button></span>
            ))}
            <button type="button" className="q-add" onClick={() => fileRef.current.click()}><ImagePlus size={16} /> Photo</button>
            <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </div>
        </div>
      )}
    </div>
  );
}

// The lists only carry inspections without photos, so the full record is loaded before the form is built from it.
export default function InspectionForm() {
  const { id } = useParams();
  const booking = useDB((s) => s.bookings.find((b) => b.id === id));
  const full = useFullInspection(booking ? id : null);
  if (!full.ready) {
    return full.error
      ? <div className="page"><EmptyState title="Could not open this inspection" text={full.error} action={<Link to="/inspector/assignments"><Button>Back to assignments</Button></Link>} /></div>
      : <div className="boot"><i className="spinner" /></div>;
  }
  return <InspectionFormInner key={id} id={id} />;
}

function InspectionFormInner({ id }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useUI();
  const booking = useDB((s) => s.bookings.find((b) => b.id === id));
  const plan = useDB((s) => s.plans.find((p) => p.id === booking?.planId));
  const stored = useDB((s) => s.inspections[id]);

  const [data, setData] = useState(() => {
    const d = structuredClone(stored?.data ?? {});
    const vt = booking?.car?.type;
    if (vt && !d.summary?.vehicleType && ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Pickup'].includes(vt)) d.summary = { ...d.summary, vehicleType: { v: vt } };
    return d;
  });
  const [photos, setPhotos] = useState(() => stored?.photos ?? []);
  const [comment, setComment] = useState(() => stored?.comment ?? '');
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(stored?.updatedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [uploadCat, setUploadCat] = useState('Exterior');
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [maskFor, setMaskFor] = useState(null);
  const fileRef = useRef(null);
  const started = useRef(false);

  const completed = stored?.status === 'completed';
  const allowed = booking && booking.inspectorId === user.id && booking.status !== 'cancelled';

  useEffect(() => {
    if (allowed && !started.current && booking.status === 'assigned') {
      started.current = true;
      startInspection(id).then(() => toast.info('Inspection started – customer has been notified.')).catch((e) => toast.error(e.message || 'Could not start the inspection.'));
    }
  }, [allowed]); // eslint-disable-line

  const sections = useMemo(() => (plan ? sectionsForPlan(plan) : []), [plan]);
  const steps = [...sections.map((s) => ({ id: s.id, title: s.title, icon: ICONS[s.icon] ?? Car, section: s })), { id: 'photos', title: 'Photos', icon: Camera }, { id: 'finish', title: 'Comment & finish', icon: ClipboardCheck }];
  const cur = steps[step];
  const totals = plan ? itemTotals(plan, data) : { score: 0, progress: 0, pass: 0, fail: 0, na: 0 };

  const persist = async (silent) => {
    try {
      await saveInspection(id, { data, photos, comment });
      setSaved(new Date().toISOString()); setDirty(false);
      if (!silent) toast.success('Draft saved.');
      return true;
    } catch (e) {
      toast.error(e.message || 'Could not save your changes. Check your connection – they are still on this screen.');
      return false;
    }
  };
  useEffect(() => {
    if (!dirty || completed) return;
    const t = setTimeout(() => persist(true), 1500);
    return () => clearTimeout(t);
  }, [data, photos, comment, dirty]); // eslint-disable-line

  if (!booking || !allowed) {
    return <div className="page"><EmptyState title="Inspection not available" text="This booking is not assigned to you or no longer exists." action={<Link to="/inspector/assignments"><Button>Back to assignments</Button></Link>} /></div>;
  }

  const setCell = (sid, iid, cell) => { setData((d) => ({ ...d, [sid]: { ...d[sid], [iid]: cell } })); setDirty(true); };
  const markAllPass = (s) => { setData((d) => ({ ...d, [s.id]: passAllValues(s, d[s.id]) })); setDirty(true); toast.success('Unanswered checks marked as pass – now flag the exceptions.'); };

  const addFiles = async (files) => {
    const imgs = [...files].filter((f) => { const problem = checkUpload(f); if (problem) toast.warn(problem); return !problem; });
    if (!imgs.length) return;
    setUploading(true);
    try {
      const out = [];
      for (const f of imgs) out.push({ id: uid('ph'), category: uploadCat, src: await compressImage(f, 760, 0.6) });
      let next = [...photos];
      if (uploadCat === COVER) next = next.map((p) => (p.category === COVER ? { ...p, category: 'Exterior' } : p));
      setPhotos([...next, ...out]); setDirty(true);
      if (PLATE_CATS.includes(uploadCat) && out.length) setMaskFor(out[0]);   // the plate must be covered (or confirmed absent) before the report can be finished
      toast.success(`${out.length} photo${out.length > 1 ? 's' : ''} added to “${uploadCat}”.`);
    } catch { toast.error('Could not process one of the images.'); }
    setUploading(false);
  };
  const makeCover = (p) => { setPhotos(photos.map((x) => (x.id === p.id ? { ...x, category: COVER } : x.category === COVER ? { ...x, category: 'Exterior' } : x))); setDirty(true); toast.success('Set as the report cover photo.'); if (!p.plateChecked) setMaskFor(p); };

  const missing = plan ? missingItems(plan, data) : [];
  const coverPhoto = photos.find((p) => p.category === COVER);
  if (!coverPhoto) missing.push('Choose a cover photo (front ¾ view) and cover the number plate with the logo');
  const uncovered = photos.filter((p) => PLATE_CATS.includes(p.category) && !p.plateChecked).length;
  if (coverPhoto && uncovered) missing.push(`Cover the number plate with the logo (shield button) on ${uncovered} cover / exterior photo${uncovered > 1 ? 's' : ''}, or confirm that no plate is visible`);
  if (photos.length < 3) missing.push(`Add at least 3 photos (${photos.length} so far)`);
  if (comment.trim().length < 20) missing.push('Write an inspector comment (20+ characters)');

  const finish = async () => {
    if (!await persist(true)) return;
    try { await completeInspection(id); } catch (e) { toast.error(e.message || 'Could not complete the inspection.'); return; }
    toast.success('Inspection completed and report generated.', 'Nice work!');
    nav('/inspector/history');
  };
  const saveEdits = async () => { if (await persist(true)) toast.success('Changes saved to the report.'); };
  const v = verdict(totals.score);
  const secState = (s) => {
    const need = s.items.filter((it) => isGradedType(it) || it.req);
    const n = need.filter((it) => isAnswered(data[s.id]?.[it.id])).length;
    return n === need.length ? 'done' : n > 0 ? 'part' : '';
  };

  let lastKey = '';
  return (
    <div className="page insp">
      <div className="insp-head">
        <Link to="/inspector/assignments" className="back-link"><ArrowLeft size={16} /> Assignments</Link>
        <div className="insp-title">
          <div><h1>{carName(booking.car)}</h1><p className="muted">{booking.id} · {booking.car.reg} · {plan.name} plan · {fmtDate(booking.date)} {fmtTime(booking.time)}</p></div>
          <div className="insp-actions">
            <span className="autosave">{dirty ? <><Cloud size={14} /> Unsaved changes…</> : saved ? <><Check size={14} /> Saved {new Date(saved).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</> : null}</span>
            <StatusBadge status={completed ? 'completed' : 'ongoing'} />
            {completed ? <Button icon={Save} onClick={saveEdits} disabled={!dirty}>Save changes</Button> : <Button variant="outline" icon={Save} onClick={() => persist(false)}>Save draft</Button>}
          </div>
        </div>
      </div>

      <div className="insp-layout">
        <aside className="insp-nav card">
          <div className="insp-score"><ScoreRing score={totals.score} size={92} label="score" /><div><Badge tone={v.tone}>{v.label}</Badge><p className="muted small">{totals.pass} pass · {totals.fail} defects · {totals.na} n/a</p></div></div>
          <div className="progress"><i style={{ width: `${totals.progress}%` }} /></div>
          <p className="muted small">{totals.progress}% of checklist completed</p>
          <ul>
            {steps.map((s, i) => {
              const state = s.section ? secState(s.section) : s.id === 'photos' ? (photos.some((p) => p.category === COVER) && photos.length >= 3 ? 'done' : photos.length ? 'part' : '') : (comment.trim().length >= 20 ? 'done' : '');
              return (
                <li key={s.id}>
                  <button className={`${i === step ? 'active' : ''} ${state}`} onClick={() => setStep(i)}>
                    <span className="sn">{state === 'done' ? <Check size={14} /> : <s.icon size={14} />}</span><em>{s.title}</em>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="card insp-main">
          <div className="card-body step-pane fwd" key={cur.id}>
            {cur.section && (
              <>
                <div className="row-between mb">
                  <div><h3>{cur.title}</h3><p className="muted small">Mark each checkpoint. Defects need a short note – add photos as evidence.</p></div>
                  <Button size="sm" variant="outline" icon={CheckCheck} onClick={() => markAllPass(cur.section)}>Mark unanswered as pass</Button>
                </div>
                <div className="q-list">
                  {cur.section.items.map((it) => {
                    const key = `${it.sub ?? ''}|${it.group ?? ''}`;
                    const head = key !== lastKey && (it.sub || it.group);
                    const subChanged = it.sub && !lastKey.startsWith(`${it.sub}|`);
                    lastKey = key;
                    return (
                      <div key={it.id}>
                        {subChanged && <h4 className="q-sub">{it.sub}</h4>}
                        {head && it.group && <div className="q-group">{it.group}</div>}
                        <ItemRow item={it} cell={data[cur.id]?.[it.id]} onChange={(c) => setCell(cur.id, it.id, c)} toast={toast} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {cur.id === 'photos' && (
              <>
                <h3>Photos</h3>
                <p className="muted small mb">Pick a section, then add photos – they appear under that heading in the PDF.</p>
                <div className="cover-tip"><ShieldCheck size={18} /><span><b>Cover photo:</b> upload a front ¾ view under “Cover”, then use <b>Hide plate</b> – the number plate is replaced by the Car InspectO logo.</span></div>
                <div className="chips">
                  {PHOTO_CATEGORIES.map((c) => <button key={c} className={`chip ${uploadCat === c ? 'on' : ''}`} onClick={() => setUploadCat(c)}>{c} {photos.filter((p) => p.category === c).length > 0 && <em>{photos.filter((p) => p.category === c).length}</em>}</button>)}
                </div>
                <div className={`dropzone ${drag ? 'drag' : ''}`} onClick={() => fileRef.current.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
                  <Upload size={26} />
                  <b>{uploading ? 'Processing…' : `Drop photos here or click to upload (${uploadCat})`}</b>
                  <span className="muted small">JPG or PNG, up to 10 MB each · you can add several at once</span>
                  <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                </div>
                {photos.length > 0 && (
                  <div className="photo-grid mt">
                    {photos.map((p) => (
                      <figure key={p.id} className={`photo ${p.category === COVER ? 'is-cover' : ''}`}>
                        <img src={p.src} alt={p.category} />
                        {p.category === COVER && <em className="cover-flag"><Star size={11} fill="currentColor" /> {p.plateChecked ? 'Cover · plate covered' : 'Cover · cover the plate'}</em>}
                        {p.category !== COVER && PLATE_CATS.includes(p.category) && !p.plateChecked && <em className="cover-flag">Cover the plate</em>}
                        <div className="photo-tools">
                          <button title="Hide number plate with logo" aria-label="Hide plate" onClick={() => setMaskFor(p)}><ShieldCheck size={14} /></button>
                          {p.category !== COVER && <button title="Use as cover" aria-label="Use as cover" onClick={() => makeCover(p)}><Star size={14} /></button>}
                          <button className="danger" title="Delete" aria-label="Delete photo" onClick={() => { setPhotos(photos.filter((x) => x.id !== p.id)); setDirty(true); }}><Trash2 size={14} /></button>
                        </div>
                        <SelectBox value={p.category} onChange={(e) => { const c = e.target.value; setPhotos(photos.map((x) => (x.id === p.id ? { ...x, category: c } : c === COVER && x.category === COVER ? { ...x, category: 'Exterior' } : x))); setDirty(true); if (PLATE_CATS.includes(c) && !p.plateChecked) setMaskFor(p); }}>{PHOTO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</SelectBox>
                      </figure>
                    ))}
                  </div>
                )}
              </>
            )}

            {cur.id === 'finish' && (
              <>
                <h3>Inspector comment & finish</h3>
                <Textarea label="Summary for the customer" rows={6} value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); }} placeholder="Overall condition, notable findings and your recommendation…" hint={`${comment.trim().length} characters`} />
                <div className={`finish-box ${missing.length ? '' : 'ok'}`}>
                  {missing.length ? (<><b><AlertCircle size={16} /> Before you can end the inspection</b><ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul></>) : (<b><Check size={16} /> Everything is filled in – ready to submit.</b>)}
                </div>
              </>
            )}
          </div>

          <footer className="wizard-foot">
            <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
            {step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)}>Next section <ArrowRight size={16} /></Button>
              : completed ? <Button icon={Save} onClick={saveEdits} disabled={!dirty}>Save changes</Button>
                : <Button icon={Flag} disabled={missing.length > 0} onClick={() => setFinishOpen(true)}>End inspection</Button>}
          </footer>
        </div>
      </div>

      <PlateMaskModal photo={maskFor} onClose={() => setMaskFor(null)} onApply={(src) => { setPhotos(photos.map((p) => (p.id === maskFor.id ? { ...p, src, plateChecked: true } : p))); setDirty(true); setMaskFor(nextPlate(photos, maskFor.id)); toast.success('Number plate covered with the Car InspectO logo.'); }}
        onSkip={() => { setPhotos(photos.map((p) => (p.id === maskFor.id ? { ...p, plateChecked: true } : p))); setDirty(true); setMaskFor(nextPlate(photos, maskFor.id)); }} />
      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} size="sm" title="Ready to submit?"
        footer={<><Button variant="ghost" onClick={() => setFinishOpen(false)}>Review again</Button><Button icon={Flag} onClick={() => { setFinishOpen(false); finish(); }}>End inspection</Button></>}>
        <div className="center"><ScoreRing score={totals.score} size={152} label="health score" /><p className="muted mt-s">{v.label} – {v.text}</p><p className="muted small mt-s">The customer will be notified and the PDF report will be generated. You can still edit it later from History.</p></div>
      </Modal>
    </div>
  );
}
