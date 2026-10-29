import { CAR_MAKES, CAR_TYPES, FUELS, TIME_SLOTS, CITIES, COUNTRY, TAX_NAME } from './constants';
import { market } from './market';
import { SECTIONS, countCheckpoints, isGradedType } from './inspectionSchema';
import { addDays, isoDate } from './format';
import { placeholderPhoto, carCoverArt } from './image';
import { priceFor } from './pricing';

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASIC = ['summary', 'tyres', 'interior', 'exterior'];
const STANDARD = [...BASIC, 'electrical', 'engine', 'transmission'];
const PREMIUM = [...STANDARD, 'chassis', 'diagnostics'];

export const PLANS = [
  {
    id: 'basic', name: 'Essential', price: market.plans.basic, checkpoints: countCheckpoints(BASIC), duration: '60 min', color: '#2ea6a0',
    tagline: 'Body, tyres and interior health check',
    sections: BASIC,
    features: ['Vehicle summary', 'Tyres, rims, brakes & suspension', 'Interior & exterior paint check', 'Photo-backed PDF report'],
  },
  {
    id: 'standard', name: 'Standard', price: market.plans.standard, checkpoints: countCheckpoints(STANDARD), duration: '90 min', color: '#3a2a8c', popular: true,
    tagline: 'Our most chosen plan for a thorough check',
    sections: STANDARD,
    features: ['Everything in Essential', 'Electrical systems', 'Engine bay, leaks & transmission', 'Inspector call-back'],
  },
  {
    id: 'premium', name: 'Premium', price: market.plans.premium, checkpoints: countCheckpoints(PREMIUM), duration: '2 hrs', color: '#f58220',
    tagline: 'Full inspection incl. chassis, OBD scan & road test',
    sections: PREMIUM,
    features: ['Everything in Standard', 'Chassis / subframe check', 'Pre & post-drive OBD diagnostics', 'Road test & priority scheduling'],
  },
];

const { customers: CUSTOMERS, inspectors: INSPECTORS, streets: STREETS, coords: COORDS, areas: AREAS, phones: PHONES } = market.seed;

const COLOURS = ['White', 'Grey', 'Silver', 'Black', 'Blue', 'Red'];
const MAKERS = ['Michelin', 'Bridgestone', 'Pirelli', 'Continental', 'Goodyear'];
const SIZES = ['255/35ZR19', '225/45R17', '235/55R18', '265/60R18', '205/55R16'];
const NOTES = ['Dry cracks', 'Minor scratches', 'Wear and tear', 'Light corrosion', 'Needs replacement soon', 'Slight leak observed'];

export function makeInspectionData(plan, r, quality) {
  const pickOf = (a) => a[Math.floor(r() * a.length)];
  const data = {};
  SECTIONS.filter((s) => plan.sections.includes(s.id)).forEach((s) => {
    data[s.id] = {};
    s.items.forEach((it) => {
      if (it.type === 'files') return;   // uploaded reports are added by the inspector
      const cell = {};
      if (it.type === 'pf') {
        cell.v = r() < quality ? 'pass' : 'fail';
        if (cell.v === 'fail') { if (it.defects?.length) { const d = pickOf(it.defects); cell.defects = [typeof d === 'string' ? d : d.label]; } cell.note = pickOf(NOTES); }
        else if (r() < 0.03) cell.v = 'na';
      } else if (it.type === 'panel') {
        const bad = r() > quality;
        cell.v = bad ? pickOf(['Cosmetic paint', 'Faded paint', 'Accident paint']) : 'Original';
        cell.defects = bad || r() < 0.08 ? [pickOf(['SH', 'CP', 'DT', 'CK'])] : [];
        cell.micron = Math.round(bad ? 120 + r() * 200 : 80 + r() * 40);
        if (bad) cell.note = pickOf(NOTES);
      } else if (it.type === 'multi') {
        cell.v = r() < quality ? [] : [pickOf(it.options)];
      } else if (it.type === 'select') {
        if (isGradedType(it)) cell.v = r() < quality ? it.options[0] : pickOf(it.options.slice(1));
        else cell.v = it.id === 'vehicleType' ? 'SUV' : it.id === 'regionalSpecs' ? it.options[0] : pickOf(it.options.slice(0, 2));
      } else if (it.type === 'number') {
        cell.v = it.id === 'odometer' ? Math.round(18000 + r() * 90000) : 0;
      } else if (it.id === 'vin') cell.v = 'WDB' + Math.floor(r() * 1e12).toString(36).toUpperCase().padEnd(14, '7');
      else if (it.id === 'colour') cell.v = pickOf(COLOURS);
      else if (it.id.startsWith('tyreMake')) cell.v = pickOf(MAKERS);
      else if (it.id.startsWith('tyreDate')) cell.v = `${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${2022 + Math.floor(r() * 3)}`;
      else if (it.id.startsWith('tyreSize')) cell.v = pickOf(SIZES);
      else if (it.id.startsWith('rimBrand')) cell.v = pickOf(['AMG', 'OEM', 'BBS', 'Vossen']);
      else if (it.id.startsWith('dtc')) cell.v = r() < quality ? 'None' : 'P0301, P0420';
      else cell.v = 'No abnormal behaviour observed';
      data[s.id][it.id] = cell;
    });
  });
  return data;
}

function mkAddress(id, label, no, street, city, isDefault) {
  const area = AREAS[(no * 7) % AREAS.length];
  const building = `${market.seed.buildingWord} ${no}`;
  return { id, label, building, unit: '', street, area, landmark: 'Near the main entrance', city, phone: '', line: `${building}, ${street}, ${area}`, address: `${building}, ${street}, ${area}`, isDefault };
}

export function buildSeed() {
  const r = rng(42);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const now = new Date();
  const users = [];

  users.push({
    id: 'u_admin', role: 'admin', name: 'Admin Team', email: 'admin@carinspecto.com', pw: 'admin123',
    phone: PHONES.admin, status: 'active', joinedAt: addDays(now, -400).toISOString(), city: CITIES[0],
  });
  CUSTOMERS.forEach(([name, city], i) => {
    const email = i === 0 ? market.demo.customer : `${name.toLowerCase().replace(/ /g, '.')}@example.com`;
    users.push({
      id: `u_c${i + 1}`, role: 'customer', name, email, pw: 'demo123', phone: PHONES.customer(i),
      status: i === 9 ? 'suspended' : 'active', city, joinedAt: addDays(now, -Math.round(30 + r() * 300)).toISOString(),
      addresses: [mkAddress(`a${i}`, 'Home', 12 + i, pick(STREETS), city, true)],
      paymentMethods: [{ id: `p${i}`, type: 'card', brand: pick(market.seed.cardBrands), last4: String(1000 + Math.floor(r() * 8999)), exp: '09/28', isDefault: true }],
    });
  });
  INSPECTORS.forEach(([name, city, spec], i) => {
    const email = i === 0 ? market.demo.inspector : `${name.split(' ')[0].toLowerCase()}@carinspecto.com`;
    users.push({
      id: `u_i${i + 1}`, role: 'inspector', name, email, pw: 'demo123', phone: PHONES.inspector(i),
      status: i === 4 ? 'suspended' : 'active', city, specialization: spec, rating: +(4.4 + r() * 0.55).toFixed(1),
      joinedAt: addDays(now, -Math.round(120 + r() * 300)).toISOString(), available: true,
    });
  });

  const activeCustomers = users.filter((u) => u.role === 'customer' && u.status === 'active');
  const inspectors = users.filter((u) => u.role === 'inspector');
  const bookings = [];
  const inspections = {};
  const payments = [];

  const total = 78;
  for (let i = 0; i < total; i++) {
    // spread dates from -170 days to +6 days, denser as it gets recent (growth trend)
    const dayOffset = i < 8 ? [-40, -21, -9, -3, -1, 0, 2, 5][i] : -Math.round(Math.pow(r(), 0.7) * 170) + (r() < 0.05 ? 6 : 0);
    const date = addDays(now, dayOffset);
    const customer = i < 8 ? users[1] : pick(activeCustomers);
    const plan = i < 8 ? PLANS[[1, 2, 0, 1, 2, 1, 2, 0][i]] : PLANS[r() < 0.22 ? 0 : r() < 0.62 ? 1 : 2];
    const make = pick(Object.keys(CAR_MAKES));
    const model = pick(CAR_MAKES[make]);
    const city = customer.city;
    const insp = i < 8 && dayOffset < 3 && i % 2 === 0 ? inspectors[0] : inspectors.filter((x) => x.city === city && x.status === 'active')[0] || pick(inspectors.filter((x) => x.status === 'active'));
    let status;
    if (dayOffset < -1) status = r() < 0.08 ? 'cancelled' : 'completed';
    else if (dayOffset <= 0) status = 'ongoing';
    else status = r() < 0.5 ? 'assigned' : 'pending';
    if (i === 7) status = 'pending';
    const hasInspector = ['assigned', 'ongoing', 'completed'].includes(status);
    const pricing = priceFor(plan, i % 9 === 0 ? 0.1 : 0);
    const created = addDays(date, -Math.round(1 + r() * 4));
    const id = `CI-${1001 + i}`;
    const timeline = [{ at: created.toISOString(), label: 'Booking placed', by: customer.name }, { at: created.toISOString(), label: 'Payment received', by: 'System' }];
    if (hasInspector) timeline.push({ at: addDays(created, 0).toISOString(), label: `Assigned to ${insp.name}`, by: 'Admin Team' });
    if (['ongoing', 'completed'].includes(status)) timeline.push({ at: date.toISOString(), label: 'Inspection started', by: insp.name });
    if (status === 'completed') timeline.push({ at: date.toISOString(), label: 'Inspection completed & report generated', by: insp.name });
    if (status === 'cancelled') timeline.push({ at: addDays(created, 1).toISOString(), label: 'Booking cancelled', by: customer.name });

    const booking = {
      id, customerId: customer.id, inspectorId: hasInspector ? insp.id : null,
      car: { type: pick(CAR_TYPES), make, model, year: now.getFullYear() - Math.floor(1 + r() * 9), fuel: pick(FUELS.slice(0, 4)), reg: market.seed.plate(pick, r) },
      planId: plan.id,
      location: { ...mkAddress('', 'Home', 12 + i, pick(STREETS), city, false), lat: COORDS[city][0], lng: COORDS[city][1] },
      date: isoDate(date), time: pick(TIME_SLOTS), status, pricing,
      payment: { status: status === 'cancelled' ? 'refunded' : 'paid', method: pick(market.seed.payMethods), txnId: `TXN${Math.floor(r() * 1e9)}` },
      purpose: pick(['Pre-purchase check', 'Routine check-up', 'Pre-purchase check', 'Post-accident check', 'Pre-trip check']), createdAt: created.toISOString(), timeline,
      rating: status === 'completed' && r() < 0.7 ? Math.round(4 + r()) : null,
    };
    bookings.push(booking);
    payments.push({ id: `pay_${id}`, bookingId: id, customerId: customer.id, amount: pricing.total, vat: pricing.vat, status: booking.payment.status, method: booking.payment.method, txnId: booking.payment.txnId, at: created.toISOString() });

    if (status === 'completed' || status === 'ongoing') {
      const quality = 0.72 + r() * 0.26;
      const data = makeInspectionData(plan, r, quality);
      const done = status === 'completed';
      inspections[id] = {
        bookingId: id, status: done ? 'completed' : 'draft', data,
        photos: done ? [
          { id: `${id}_c`, category: 'Cover', plateChecked: true, src: carCoverArt(200 + (i % 6) * 25) },
          ...['Exterior', 'Exterior', 'Interior', 'Interior', 'Engine Bay & Undercarriage', 'Engine Bay & Undercarriage'].map((c, k) => ({ id: `${id}_${k}`, category: c, plateChecked: true, src: placeholderPhoto(c, 200 + k * 30 + (i % 5) * 12) })),
        ] : [],
        comment: done ? pick([
          'Vehicle is in good overall condition for its age. Minor wear on front tyres and some paint touch-ups on the rear bumper. Recommend negotiating on tyre replacement.',
          'Well-maintained example with a full service history. No accident repair found. Engine and gearbox perform smoothly on the road test.',
          'A few suspension noises over bumps; bushes likely due for replacement. Everything else is satisfactory and priced fairly.',
        ]) : '',
        updatedAt: date.toISOString(), completedAt: done ? date.toISOString() : null,
      };
    }
  }

  const tickets = [
    ['Report not downloading', 'Reports', 'high', 'open', 'u_c2'], ['Reschedule my inspection', 'Booking', 'medium', 'in_progress', 'u_c2'],
    ['Refund for cancelled booking', 'Payments', 'high', 'open', 'u_c4'], ['Inspector arrived late', 'Service', 'low', 'resolved', 'u_c5'],
    ['Change registered phone number', 'Account', 'low', 'resolved', 'u_c3'], [`Need ${TAX_NAME} invoice (${market.taxIdLabel})`, 'Payments', 'medium', 'in_progress', 'u_c6'],
    ['Wrong car model on report', 'Reports', 'high', 'open', 'u_c7'], ['Coupon code not applying', 'Payments', 'medium', 'open', 'u_c8'],
    ['How long is a Premium inspection?', 'General', 'low', 'resolved', 'u_c9'],
  ].map(([subject, category, priority, status, customerId], i) => ({
    id: `T-${200 + i}`, subject, category, priority, status, customerId, createdAt: addDays(now, -i * 3 - 1).toISOString(),
    messages: [
      { from: 'customer', text: `Hi team, ${subject.toLowerCase()}. Could you please help?`, at: addDays(now, -i * 3 - 1).toISOString() },
      ...(status !== 'open' ? [{ from: 'admin', text: 'Thanks for reaching out – we are looking into this right now.', at: addDays(now, -i * 3).toISOString() }] : []),
    ],
  }));

  const notifications = [
    { id: 'n1', userId: 'u_c1', title: 'Inspection report ready', body: 'Your report for CI-1002 is ready to download.', at: addDays(now, -1).toISOString(), read: false },
    { id: 'n2', userId: 'u_c1', title: 'Inspector assigned', body: 'Rohan Desai will inspect your car on your chosen slot.', at: addDays(now, -2).toISOString(), read: false },
    { id: 'n3', userId: 'u_i1', title: 'New inspection assigned', body: 'You have a new inspection in your queue.', at: addDays(now, -1).toISOString(), read: false },
    { id: 'n4', userId: 'u_admin', title: 'New support ticket', body: 'T-207 · Wrong car model on report', at: addDays(now, -1).toISOString(), read: false },
  ];

  const content = {
    faqs: [
      { id: 'f1', q: 'How long does an inspection take?', a: `Between 60 minutes and 2 hours depending on the plan you choose. Our inspector will come to your location anywhere in ${COUNTRY === 'UAE' ? 'the UAE' : COUNTRY}.` },
      { id: 'f2', q: 'When will I receive my report?', a: 'Your branded PDF report is available in your dashboard minutes after the inspector finishes, and we email you a copy.' },
      { id: 'f3', q: 'Can I reschedule or cancel a booking?', a: 'Yes. You can reschedule or cancel from My Bookings up to 4 hours before the slot. Cancelled paid bookings are refunded.' },
      { id: 'f4', q: 'Are inspectors verified?', a: 'Every Car InspectO inspector is background-checked, trained and certified before taking assignments.' },
      { id: 'f5', q: 'Which payment methods are accepted?', a: `${market.payMethodsText} – online payments are secured by our payment partner. ${TAX_NAME} and the booking fee are shown before you pay.` },
    ],
    terms: 'By booking an inspection you agree that Car InspectO provides a visual and diagnostic assessment of the vehicle at the time of inspection. Reports are advisory and do not constitute a warranty.',
    privacy: 'We only collect the data needed to deliver your inspection. Your information is encrypted in transit and never sold to third parties.',
  };

  return { version: 3, users, plans: PLANS, bookings, inspections, payments, tickets, notifications, content, activity: [] };
}
