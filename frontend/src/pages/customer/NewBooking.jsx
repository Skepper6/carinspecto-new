import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Car, Layers, MapPin, CalendarClock, CreditCard, Check, ArrowLeft, ArrowRight, Crosshair, Lock, PartyPopper, Apple, Banknote,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, createBooking, updateUser } from '../../lib/db';
import { priceFor } from '../../lib/pricing';
import { market } from '../../lib/market';
import { CAR_TYPES, CAR_MAKES, FUELS, YEARS, TIME_SLOTS, CITIES, TAX_NAME, VAT_RATE, INSPECTION_REASONS } from '../../lib/constants';
import { carName, fmtDate, fmtTime, isoDate, money, uid } from '../../lib/format';
import { Field, Input, PageHeader, Select, Tm } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import Calendar from '../../components/ui/Calendar';
import Modal from '../../components/ui/Modal';
import Combobox from '../../components/ui/Combobox';
import { CAR_DB, ALL_YEARS, makesForYear, modelsFor, findModel, productionRange, BODY_TYPES, BODY_LABEL, FUEL_TYPES, VARIANTS } from '../../lib/carData';
import AddressFields, { EMPTY_ADDRESS, formatAddress, validateAddress, withLabel } from '../../components/shared/AddressFields';
import StripeCheckout from '../../components/shared/StripeCheckout';
import RazorpayCheckout from '../../components/shared/RazorpayCheckout';
import PlanDetails from '../../components/shared/PlanDetails';
import { onlineEnabled, onlineLabel, onlineMethodName, onlineKeyHint } from '../../services/payments';
import { formatCardNumber, formatExpiry, formatCvv, validateCardNumber, validateExpiry, validateCvv } from '../../lib/card';

const STEPS = [['Plan & price', Layers], ['Vehicle', Car], ['Location', MapPin], ['Date & time', CalendarClock], ['Review & pay', CreditCard]];

// a slot is closed when its time has already passed today, or two real bookings already hold it
const taken = (date, slot, bookings) => {
  if (new Date(`${date}T${slot}:00`) <= new Date()) return true;
  return bookings.filter((b) => b.date === date && b.time === slot && b.status !== 'cancelled').length >= 2;
};

// Until Stripe is configured, cards are accepted as a demo: the card number is only length-checked and nothing is charged
const CARDS_AVAILABLE = true;

export default function NewBooking() {
  const { user } = useAuth();
  const { toast } = useUI();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const plans = useDB((s) => s.plans);
  const bookings = useDB((s) => s.bookings);
  const me = useDB((s) => s.users.find((u) => u.id === user.id));

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState({});
  const [car, setCar] = useState({ type: '', make: '', model: '', year: '', fuel: '', variant: '', reg: '' });
  const [planId, setPlanId] = useState(plans.some((p) => p.id === params.get('plan')) ? params.get('plan') : 'standard');
  const [loc, setLoc] = useState(() => ({ ...EMPTY_ADDRESS, phone: me.phone ?? '', ...(me.addresses?.[0] ?? {}), lat: null, lng: null }));
  const [saveAddr, setSaveAddr] = useState(!me.addresses?.length);
  const confirmRef = useRef(null);
  const [date, setDate] = useState(() => { const n = new Date(); return n.getHours() >= 17 ? isoDate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1)) : isoDate(); });
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState(INSPECTION_REASONS[0]);
  const [other, setOther] = useState({ reason: '', fuel: '', type: '' });
  const setOtherField = (k) => (e) => { setOther((o) => ({ ...o, [k]: e.target.value })); setErrors((x) => ({ ...x, [`${k}Other`]: undefined })); };
  const [method, setMethod] = useState(!CARDS_AVAILABLE ? 'cash' : onlineEnabled ? 'online' : me.paymentMethods?.[0] ? 'card:' + me.paymentMethods[0].id : 'newcard');   // with real payments on, saved demo cards are not offered, so start on the online option
  const [nc, setNc] = useState({ number: '', exp: '', cvv: '' });
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(null);
  const [locating, setLocating] = useState(false);

  const plan = plans.find((p) => p.id === planId);
  const price = useMemo(() => (plan ? priceFor(plan, 0) : null), [plan]);
  const setCarField = (k, v) => {
    setCar((c) => {
      const n = { ...c, [k]: v };
      if (k === 'year' && n.make && CAR_DB[n.make] && !modelsFor(n.make, Number(v)).length) { n.make = ''; n.model = ''; n.type = ''; }
      else if (k === 'year' && n.model && CAR_DB[n.make] && findModel(n.make, n.model) && !modelsFor(n.make, Number(v)).some((m) => m.name === n.model)) { n.model = ''; n.type = ''; }
      if (k === 'make') { n.model = ''; n.type = ''; }
      if (k === 'model') { const m = findModel(n.make, v); if (m) n.type = m.body; }
      return n;
    });
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const yearNum = Number(car.year) || null;
  const makeOptions = useMemo(() => makesForYear(yearNum), [yearNum]);
  const modelOptions = useMemo(() => modelsFor(car.make, yearNum).map((m) => ({ value: m.name, label: m.name, hint: productionRange(m) })), [car.make, yearNum]);
  const upd = (k) => (e) => { setCar((c) => ({ ...c, [k]: e.target.value, ...(k === 'make' ? { model: '' } : {}) })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (step === 1) {
      ['type', 'make', 'model', 'year', 'fuel'].forEach((k) => { if (!car[k]) e[k] = 'Required'; });
      if (!car.reg.trim()) e.reg = 'Enter the registration number';
      if (car.type === 'Other' && other.type.trim().length < 2) e.typeOther = 'Please type the body type';
      if (car.fuel === 'Other' && other.fuel.trim().length < 2) e.fuelOther = 'Please type the fuel type';
      if (purpose === 'Other' && other.reason.trim().length < 3) e.reasonOther = 'Please tell us the reason';
    }
    if (step === 2) {
      Object.assign(e, validateAddress(loc));
    }
    if (step === 3) {
      if (!date) e.date = 'Pick a date';
      if (!time) e.time = 'Pick a time slot';
    }
    if (step === 4 && method === 'newcard') {
      const en = validateCardNumber(nc.number, onlineEnabled), ee = validateExpiry(nc.exp), ec = validateCvv(nc.cvv, nc.number);
      if (en) e.number = en;
      if (ee) e.exp = ee;
      if (ec) e.cvv = ec;
    }
    setErrors(e);
    if (Object.keys(e).length) toast.warn('Please complete the highlighted fields.');
    return !Object.keys(e).length;
  };
  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = () => validate() && go(step + 1);

  const gps = () => {
    if (!navigator.geolocation) return toast.error('Location is not supported on this device.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc((l) => ({ ...l, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocating(false);
        toast.success('Location pinned. Please fill in the address details below.');
      },
      () => { setLocating(false); toast.error('Could not get your location. Please enter it manually.'); },
      { timeout: 8000 }
    );
  };


  const payLock = useRef(false);   // a quick double-tap must not start two payments
  const pay = async () => {
    if (payLock.current || !validate()) return;
    payLock.current = true;
    setPaying(true);
    let intent = null;
    if (method === 'online') {
      try { intent = await confirmRef.current(); } catch (err) { payLock.current = false; setPaying(false); toast.error(err.message || 'Payment failed', 'Payment not completed'); return; }
    } else await new Promise((r) => setTimeout(r, 1200));
    const card = me.paymentMethods?.find((c) => 'card:' + c.id === method);
    const label = method === 'online' ? onlineMethodName : method === 'applepay' ? 'Apple Pay' : method === 'cash' ? 'Cash on arrival' : method === 'newcard' ? `Card •••• ${nc.number.replace(/\s/g, '').slice(-4)}` : `${card.brand} •••• ${card.last4}`;
    let b;
    try {
      b = await createBooking(user, { car: { ...car, year: Number(car.year), type: car.type === 'Other' ? other.type.trim() : car.type, fuel: car.fuel === 'Other' ? other.fuel.trim() : car.fuel }, location: { ...loc, address: formatAddress(loc) }, date, time, purpose: purpose === 'Other' ? other.reason.trim() : purpose }, plan, '', label, method === 'cash' ? 'pending' : 'paid', intent?.id ?? null, intent?.proof ?? null);
    } catch (err) {
      payLock.current = false; setPaying(false);
      toast.error(intent ? `${err.message} Your card was charged, so please contact support with reference ${intent.id}.` : err.message, 'Booking not completed');
      return;
    }
    if (saveAddr) updateUser(me.id, { addresses: [...(me.addresses ?? []), { id: uid('a'), ...withLabel(loc), lat: null, lng: null, line: formatAddress(loc), address: formatAddress(loc), isDefault: !me.addresses?.length }] }).catch(() => {});
    payLock.current = false; setPaying(false);
    setDone(b);
  };

  if (!plan) return (
    <div className="page">
      <PageHeader title="Book an inspection" subtitle="Inspection plans are not available right now. Please try again in a few minutes." />
    </div>
  );

  const marks = {};
  return (
    <div className="page">
      <PageHeader title="Book an inspection" subtitle="Compare the plans and prices first – you only pay at the end." />
      <ol className="stepper">
        {STEPS.map(([label, Icon], i) => (
          <li key={label} className={`${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}>
            <button type="button" disabled={i >= step} onClick={() => go(i)}>
              <span>{i < step ? <Check size={16} /> : <Icon size={16} />}</span><em>{label}</em>
            </button>
          </li>
        ))}
        <li aria-hidden="true" className="stepper-fill" style={{ width: `${(step / (STEPS.length - 1)) * 80}%` }} />
      </ol>

      <div className="book-grid">
        <div className="card">
          <div className={`card-body step-pane ${dir > 0 ? 'fwd' : 'back'}`} key={step}>
            {step === 1 && (
              <>
                <h3>Tell us about the car</h3>
                <div className="form-grid">
                  <Combobox label="Year" value={car.year} onChange={(v) => setCarField('year', v)} options={ALL_YEARS.map(String)} placeholder="Select year" error={errors.year} />
                  <Combobox label="Brand" value={car.make} onChange={(v) => setCarField('make', v)} options={makeOptions} placeholder="Select or type brand" allowCustom error={errors.make} hint={`${makeOptions.length} brands${yearNum ? ` sold in ${yearNum}` : ''}`} />
                  <Combobox label="Model" value={car.model} onChange={(v) => setCarField('model', v)} options={modelOptions} placeholder={car.make ? 'Select or type model' : 'Select a brand first'} allowCustom disabled={!car.make} error={errors.model} hint={car.make ? `${modelOptions.length} models${yearNum ? ` in ${yearNum}` : ''}` : undefined} />
                  <Select label="Body type" value={car.type} onChange={(e) => setCarField('type', e.target.value)} options={[...BODY_TYPES.map((b) => ({ value: b, label: BODY_LABEL[b] ?? b })), { value: 'Other', label: 'Other' }]} placeholder="Select" error={errors.type} />
                  {car.type === 'Other' && <Input label="Specify body type" value={other.type} onChange={setOtherField('type')} placeholder="e.g. Limousine, Minibus" error={errors.typeOther} autoFocus />}
                  <Select label="Fuel type" value={car.fuel} onChange={(e) => setCarField('fuel', e.target.value)} options={[...FUEL_TYPES, 'Other']} placeholder="Select" error={errors.fuel} />
                  {car.fuel === 'Other' && <Input label="Specify fuel type" value={other.fuel} onChange={setOtherField('fuel')} placeholder="e.g. Hydrogen, LPG" error={errors.fuelOther} autoFocus />}
                  <Combobox label="Variant / trim (optional)" value={car.variant} onChange={(v) => setCarField('variant', v)} options={VARIANTS} placeholder="Select or type" allowCustom />
                  <Input className="span-2" label="Registration number" value={car.reg} onChange={upd('reg')} placeholder={market.examples.plate} error={errors.reg} />
                </div>
                <Field label="Reason for inspection">
                  <div className="chips">{INSPECTION_REASONS.map((p) => <button key={p} type="button" className={`chip ${purpose === p ? 'on' : ''}`} onClick={() => setPurpose(p)}>{p}</button>)}</div>
                </Field>
                {purpose === 'Other' && <Input label="Tell us the reason" value={other.reason} onChange={setOtherField('reason')} placeholder="e.g. Insurance claim, fleet check" error={errors.reasonOther} autoFocus />}
              </>
            )}

            {step === 0 && (
              <>
                <h3>Choose your inspection plan</h3>
                <p className="muted small mb">Prices are shown before you enter any details. The all-in total includes {TAX_NAME} and the booking fee.</p>
                <div className="plan-pick">
                  {plans.map((p) => (
                    <button key={p.id} type="button" className={`pick ${planId === p.id ? 'on' : ''}`} onClick={() => setPlanId(p.id)} style={{ '--c': p.color }}>
                      {p.popular && <span className="plan-flag">Popular</span>}
                      <span className="pick-check"><Check size={14} /></span>
                      <h4>{p.name}</h4>
                      <b>{money(p.price)}<small> + {TAX_NAME}</small></b>
                      <span className="pick-total">All-in: <b>{money(priceFor(p, 0).total)}</b></span>
                      <span className="muted small">{p.checkpoints} checkpoints · {p.duration}</span>
                      <PlanDetails plan={p} chooseLabel={`Select ${p.name}`} onChoose={() => setPlanId(p.id)} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3>Where should the inspector come?</h3>
                {me.addresses?.length > 0 && (
                  <div className="chips">
                    {me.addresses.map((a) => (
                      <button key={a.id} type="button" className={`chip ${formatAddress(loc) === formatAddress(a) ? 'on' : ''}`} onClick={() => { setLoc({ ...EMPTY_ADDRESS, phone: me.phone ?? '', ...a, lat: null, lng: null }); setErrors({}); setSaveAddr(false); }}>
                        <MapPin size={14} />{a.label} · {formatAddress(a)}
                      </button>
                    ))}
                  </div>
                )}
                <AddressFields value={loc} onChange={(v) => { setLoc(v); setErrors({}); }} errors={errors} onGps={gps} locating={locating} />
                <label className="check"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /><span>Save this address to my profile</span></label>
              </>
            )}

            {step === 3 && (
              <>
                <h3>Pick a date and time</h3>
                <div className="cal-wrap">
                  <div>
                    <Calendar value={date} onChange={(d) => { setDate(d); setTime(''); setErrors({ ...errors, date: undefined }); }} min={isoDate()} marks={marks} />
                    {errors.date && <p className="field-error mt-s">{errors.date}</p>}
                  </div>
                  <div className="slots">
                    <h4>{date ? fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a date first'}</h4>
                    <div className="slot-grid">
                      {TIME_SLOTS.map((t) => {
                        const off = !date || taken(date, t, bookings);
                        return <button key={t} type="button" disabled={off} className={time === t ? 'on' : ''} onClick={() => { setTime(t); setErrors({ ...errors, time: undefined }); }}><Tm t={t} /></button>;
                      })}
                    </div>
                    {errors.time && <p className="field-error">{errors.time}</p>}
                    <p className="muted small">Greyed-out slots have passed or are fully booked.</p>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h3>Review & pay</h3>
                <div className="review-box">
                  <div><span>Vehicle</span><b>{carName(car)} · {car.fuel === 'Other' ? other.fuel : car.fuel}</b></div>
                  <div><span>Plan</span><b>{plan.name}</b></div>
                  <div><span>Location</span><b>{formatAddress(loc)}, {loc.city}{loc.landmark ? ` (${loc.landmark})` : ''}</b></div>
                  <div><span>Slot</span><b>{fmtDate(date)} · {fmtTime(time)}</b></div>
                </div>

                <Field label="Payment method">
                  <div className="pay-methods">
                    {!CARDS_AVAILABLE ? null : onlineEnabled ? (
                      <button type="button" className={method === 'online' ? 'on' : ''} onClick={() => setMethod('online')}><CreditCard size={18} />{onlineLabel}</button>
                    ) : (
                      <>
                        {me.paymentMethods?.map((c) => (
                          <button key={c.id} type="button" className={method === 'card:' + c.id ? 'on' : ''} onClick={() => setMethod('card:' + c.id)}><CreditCard size={18} />{c.brand} •••• {c.last4}</button>
                        ))}
                        <button type="button" className={method === 'newcard' ? 'on' : ''} onClick={() => setMethod('newcard')}><CreditCard size={18} />New card</button>
                        <button type="button" className={method === 'applepay' ? 'on' : ''} onClick={() => setMethod('applepay')}><Apple size={18} />Apple Pay</button>
                      </>
                    )}
                    <button type="button" className={method === 'cash' ? 'on' : ''} onClick={() => setMethod('cash')}><Banknote size={18} />Cash on arrival</button>
                  </div>
                </Field>
                {method === 'online' && (market.paymentProvider === 'razorpay'
                  ? <RazorpayCheckout amount={price.total} user={user} register={(fn) => { confirmRef.current = fn; }} />
                  : <StripeCheckout amount={price.total} email={user.email} register={(fn) => { confirmRef.current = fn; }} />)}
                {!CARDS_AVAILABLE && <p className="muted small mt-s">Card payments are coming soon – please choose cash on arrival for now.</p>}
                {!onlineEnabled && <p className="muted small mt-s">{import.meta.env.PROD ? 'Online card charging is not switched on yet – your card is not charged now. Your booking is confirmed and our team will contact you to collect payment.' : <>Demo mode – add your {onlineKeyHint} in <b>.env</b> to take real payments.</>}</p>}
                {method === 'newcard' && (
                  <div className="form-grid three">
                    <Input label="Card number" value={nc.number} onChange={(e) => { const number = formatCardNumber(e.target.value); setNc({ ...nc, number, cvv: formatCvv(nc.cvv, number) }); setErrors({}); }} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" maxLength={19} error={errors.number} />
                    <Input label="Expiry" value={nc.exp} onChange={(e) => { setNc({ ...nc, exp: formatExpiry(e.target.value, nc.exp) }); setErrors({}); }} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" maxLength={5} error={errors.exp} />
                    <Input label="CVV" value={nc.cvv} onChange={(e) => { setNc({ ...nc, cvv: formatCvv(e.target.value, nc.number) }); setErrors({}); }} placeholder="123" inputMode="numeric" autoComplete="cc-csc" maxLength={4} error={errors.cvv} />
                  </div>
                )}
                {method === 'cash' && <p className="muted small mt-s">Pay the inspector in cash (or by card machine) when they arrive. Total due: {money(price.total)}.</p>}
                <p className="secure"><Lock size={14} /> Payments are encrypted and processed by our secure gateway.</p>
                <p className="muted small mt-s">By booking you agree to our <Link to="/terms" target="_blank">Terms &amp; Conditions</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</p>
              </>
            )}
          </div>

          <footer className="wizard-foot">
            <Button variant="ghost" icon={ArrowLeft} disabled={step === 0 || paying} onClick={() => go(step - 1)}>Back</Button>
            {step < 4 ? <Button onClick={next}>Continue <ArrowRight size={16} /></Button>
              : <Button loading={paying} icon={Lock} onClick={pay}>{method === 'cash' ? 'Confirm booking' : `Pay ${money(price.total)}`}</Button>}
          </footer>
        </div>

        <aside className="card summary">
          <div className="card-body">
            <h3>Order summary</h3>
            <p className="muted small">{car.make ? carName({ ...car, year: car.year || '' }).trim() : 'Your vehicle'}</p>
            <div className="sum-plan" style={{ '--c': plan.color }}><b>{plan.name}</b><span>{plan.checkpoints} checkpoints</span></div>
            <div className="price-box flat">
              <div><span>Inspection</span><b>{money(price.plan)}</b></div>
              <div><span>Booking fee</span><b>{money(price.bookingFee)}</b></div>
              <div><span>{TAX_NAME} ({Math.round(VAT_RATE * 100)}%)</span><b>{money(price.vat)}</b></div>
              <div className="total"><span>Total</span><b>{money(price.total)}</b></div>
            </div>
            {date && time && <p className="sum-slot"><CalendarClock size={15} /> {fmtDate(date)} · {fmtTime(time)}</p>}
          </div>
        </aside>
      </div>

      <Modal open={paying} onClose={() => {}} size="sm" title="Processing payment">
        <div className="processing"><i className="spinner" /><p>Securely confirming your payment…</p></div>
      </Modal>
      <Modal open={!!done} onClose={() => nav('/app/bookings')} size="sm" title="Booking confirmed!">
        {done && (
          <div className="success">
            <span className="success-icon"><PartyPopper size={34} /></span>
            <h3>{done.id}</h3>
            <div className="success-detail">
              <b>{carName(done.car)}</b>
              <span>{fmtDate(done.date)} · {fmtTime(done.time)}</span>
              <p className="muted">We will assign an inspector shortly and notify you.</p>
            </div>
            <div className="success-actions">
              <Link to="/app/bookings"><Button>View my bookings</Button></Link>
              <Link to="/app"><Button variant="ghost">Go to dashboard</Button></Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
