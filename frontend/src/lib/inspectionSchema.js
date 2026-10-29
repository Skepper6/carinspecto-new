// Structured inspection checklist modelled on a professional pre-purchase report.
// Item types:  pf (pass / fail / n-a)  ·  select  ·  number  ·  text
//              panel (paint state + defects + paint thickness)  ·  multi (pick any: e.g. leak sources)
// Items may carry `sub` (sub-heading, e.g. "Tyres") and `group` (e.g. "Front Left (FL)").
// Stored value shape: data[sectionId][itemId] = { v, note, photos: [dataUrl], defects: [], micron }
//   - pf / select items: `defects` holds the chosen standard findings (labels from item.defects), `note` the additional comments
//   - panel items: `defects` holds damage codes (SH, CP, DT, CK)
//   - files items: `photos` holds uploaded images or PDFs (data URLs)

import { market } from './market';

const WHEELS = [['RR', 'Rear Right (RR)'], ['RL', 'Rear Left (RL)'], ['FR', 'Front Right (FR)'], ['FL', 'Front Left (FL)']];
const WHEELS_ST = [...WHEELS, ['ST', 'Spare tyre (ST)']];

const tyres = WHEELS_ST.flatMap(([k, g]) => [
  { id: `tyre${k}`, sub: 'Tyres', group: g, label: 'Tyre condition', type: 'pf' },
  { id: `tyreMake${k}`, sub: 'Tyres', group: g, label: 'Tyre manufacturer', type: 'text', placeholder: 'e.g. Michelin' },
  { id: `tyreDate${k}`, sub: 'Tyres', group: g, label: 'Manufacturing date', type: 'month' },
  { id: `tyreSize${k}`, sub: 'Tyres', group: g, label: 'Tyre size', type: 'text', placeholder: '255/35ZR19' },
]);
const rims = WHEELS_ST.flatMap(([k, g]) => [
  { id: `rim${k}`, sub: 'Rims', group: g, label: 'Rim condition', type: 'pf' },
  { id: `rimBrand${k}`, sub: 'Rims', group: g, label: 'Rim brand', type: 'text' },
  { id: `rimType${k}`, sub: 'Rims', group: g, label: 'Rim type', type: 'select', options: ['Original', 'Aftermarket'] },
]);
const brakes = WHEELS.flatMap(([k, g]) => [
  { id: `brakeType${k}`, sub: 'Brakes', group: g, label: 'Brake type', type: 'select', options: ['DISC', 'DRUM'] },
  { id: `pads${k}`, sub: 'Brakes', group: g, label: 'Pads', type: 'pf' },
  { id: `disc${k}`, sub: 'Brakes', group: g, label: 'Disc / drum', type: 'pf' },
]);

export const INTERIOR_PARTS = [
  'Roof lining', 'Rear view mirror', 'Steering wheel upholstery', 'Seats upholstery', 'Gear lever', 'Trunk lining', 'Armrest & side pockets',
  'Dashboard', 'Floor mats', 'Doors', 'Front windscreen', 'Rear windscreen', 'Sun visor & vanity mirror', 'Side windows',
];
// top-view paint map. kind: 'c' centre column, 'l'/'r' side columns
export const PANELS = [
  ['frontBumper', 'Front bumper'], ['frontGrill', 'Front grill'], ['bonnet', 'Bonnet'], ['roof', 'Roof'], ['trunk', 'Trunk'], ['rearBumper', 'Rear bumper'],
  ['lFender', 'Left front fender'], ['lFrontDoor', 'Left front door'], ['lRearDoor', 'Left rear door'], ['lRearFender', 'Left rear fender'],
  ['rFender', 'Right front fender'], ['rFrontDoor', 'Right front door'], ['rRearDoor', 'Right rear door'], ['rRearFender', 'Right rear fender'],
];
export const PAINT_STATES = ['Original', 'Cosmetic paint', 'Faded paint', 'Accident paint'];
export const DEFECTS = [['SH', 'Scratch'], ['CP', 'Chip'], ['DT', 'Dent'], ['CK', 'Crack']];
export const CHASSIS_POINTS = [
  'Core support', 'Frame rail', 'Wheel house', 'Right fender apron', 'Shock tower / mount', 'Radiator side support', 'Left fender apron',
  'Front body hinge pillar', 'Front floor board', 'Left door sill', 'Centre pillar (B)', 'Mid floor board', 'Body quarter panel', 'C pillar',
  'Seat frame', 'Rear floor panel', 'Left B pillar', 'Left A pillar', 'Roof panel', 'Right B pillar', 'Right door sill', 'Right A pillar',
];
// Standard findings an inspector can tick when a check fails. A finding is a plain label or { label, description }.
const f = (label, description) => ({ label, description });
const GENERIC_TRIM = ['Dirt marks', 'Wear and tear', 'Damaged', 'Scratches', 'Misaligned', 'Stains', 'Torn', 'Missing'];
const GLASS = ['Chip', 'Crack', 'Scratches', 'Aftermarket glass', 'Tint peeling'];
const LIGHT = ['Bulb not working', 'Lens cracked', 'Moisture inside', 'Lens faded'];
const SUSPENSION = ['Oil leak from shock absorber', 'Shock absorber cover damaged', 'Worn bushes', 'Ball joint play', 'Knocking noise', 'Air suspension fault', 'Broken coil spring', 'Worn stabilizer link'];
export const CHASSIS_DEFECTS = ['Repair marks', 'Welding marks', 'Bent', 'Cracked', 'Rust', 'Sealant not original'];
const FINDINGS = {
  'Tyre condition': ['Dry cracks', 'Uneven wear', 'Low tread depth', 'Sidewall bulge', 'Cut / damage', 'Puncture repaired', 'Tyre older than 5 years', 'Mismatched tyres'],
  'Rim condition': ['Scratches', 'Curb damage', 'Bent', 'Cracked', 'Corrosion', 'Repainted'],
  Pads: ['Worn pads', 'Uneven wear', 'Squealing noise', 'Pad warning light on'],
  'Disc / drum': ['Scored / grooved', 'Worn below limit', 'Rust on disc', 'Warped (vibration)'],
  'ABS sensors': ['ABS warning light on', 'Sensor fault code', 'Damaged wiring'],
  Handbrake: ['Weak holding', 'Not releasing properly', 'Needs adjustment', 'Warning light on'],
  'Front suspension': SUSPENSION,
  'Rear suspension': SUSPENSION,
  'Roof lining': GENERIC_TRIM,
  'Rear view mirror': ['Damaged', 'Loose', 'Auto-dimming not working', 'Scratches'],
  'Steering wheel upholstery': GENERIC_TRIM,
  'Seats upholstery': GENERIC_TRIM,
  'Gear lever': GENERIC_TRIM,
  'Trunk lining': GENERIC_TRIM,
  'Armrest & side pockets': GENERIC_TRIM,
  Dashboard: [...GENERIC_TRIM, 'Cracked'],
  'Floor mats': GENERIC_TRIM,
  Doors: ['Wear and tear on door pad', 'Damage', 'Scratches', 'Misaligned', 'Dirt marks'],
  'Front windscreen': GLASS,
  'Rear windscreen': GLASS,
  'Sun visor & vanity mirror': ['Damaged', 'Mirror cracked', 'Light not working', 'Loose'],
  'Side windows': GLASS,
  Key: ['Battery health is low', 'Remote not working', 'Damaged casing', 'Only one key available'],
  Infotainment: ['Aftermarket screen', 'Screen not working', 'Touch not responding', 'Speakers not working', 'Bluetooth not working', 'Side cover misaligned'],
  'Windows operation': ['Window not working', 'Slow operation', 'Noise while operating', 'Auto up/down not working'],
  'Seats adjustment': ['Adjustment not working', 'Seat heating not working', 'Seat cooling not working', 'Memory not working'],
  'Door lock': ['Central locking not working', 'Lock faulty', 'Remote locking not working'],
  'A/C control & cooling': ['Weak cooling', 'Not cooling', 'Controls not working', 'Bad smell', 'Blower noise'],
  'Centre console buttons': ['Wear and tear', 'Button damage', 'Button not working'],
  Cameras: ['Camera not working', 'Blurry image', 'Guide lines missing'],
  Gauges: ['Warning light on', 'Gauge not working', 'Cluster display fault'],
  'Rear view / side mirrors': ['Folding not working', 'Adjustment not working', 'Mirror glass damaged', 'Indicator not working'],
  'A/C grilles': ['Broken', 'Loose', 'Missing'],
  'Ignition system': [
    f('Delay starting', 'A delay in car starting can be caused by issues such as a weak battery, faulty starter motor, worn spark plugs, or fuel system problems. This can lead to unreliable starting and potential engine performance issues. Prompt diagnosis and repair are recommended to ensure reliable operation'),
    f('Engine not starting', 'The engine did not start during the inspection. Full diagnosis is required before purchase.'),
    'Push start not working',
  ],
  'Brake lights': LIGHT,
  Headlights: [...LIGHT, 'Misaligned beam'],
  'Fog lights': LIGHT,
  'Reverse lights': LIGHT,
  'Number plate lights': LIGHT,
  'Indicators & hazards': LIGHT,
  Wipers: ['Worn blades', 'Wipers not working', 'Washer not working', 'Speed setting fault'],
  'Soft-closing doors': ['Soft close not working'],
  'Sunroof / moonroof': ['Not opening', 'Water leak marks', 'Noise while operating', 'Motor fault'],
  'Interior lights': ['Bulb not working', 'Cover damaged'],
  'Cruise control': ['Not working', 'Adaptive cruise fault'],
  Horn: ['Not working', 'Weak sound'],
  'Parking sensors': ['Not working', 'Sensor damaged', 'False alerts'],
  'Battery health': ['Battery health is low', 'Terminals corroded'],
  'Engine upper cover': ['Cracked', 'Broken clips', 'Missing', 'Scratches'],
  'Engine shield cover': ['Minor scratches', 'Cracked', 'Broken', 'Missing', 'Loose'],
  'Engine mounts': ['Worn mount', 'Broken mount', 'Excess vibration'],
  'Bonnet hinge & holder': ['Hinge damaged', 'Holder / strut weak', 'Bonnet misaligned'],
  'Turbo / supercharger': ['Oil leak', 'Whistling noise', 'Boost fault'],
  'Fender liners': ['Torn', 'Missing', 'Loose clips'],
  'Drive belt / pulleys': ['Cracked belt', 'Worn belt', 'Pulley noise', 'Loose belt'],
  'Engine idle': ['Rough idle', 'High idle', 'Engine misfire', 'Excess vibration'],
  'Engine oil filler cap': ['Damaged', 'Missing', 'Sludge under cap'],
  Radiator: ['Coolant leak', 'Damaged fins', 'Blocked', 'Cooling fan not working'],
  'Engine oil condition': ['Low oil level', 'Dirty oil', 'Overfilled', 'Milky oil'],
  'Coolant condition': ['Low coolant level', 'Dirty coolant', 'Oil in coolant'],
  'Coolant cap': ['Damaged', 'Leaking', 'Missing'],
  'Hoses & pipes': ['Cracked', 'Leaking', 'Swollen', 'Perished'],
  'Exhaust system': ['Exhaust leak', 'Rust', 'Damaged', 'Loud noise', 'Excess smoke'],
  'Visible rust': ['Surface rust', 'Heavy rust'],
  'Water scaling / dirt marks': ['Water scaling', 'Dirt marks', 'Signs of flood damage'],
  'Transmission fluid level & condition': ['Not equipped with dipstick', 'Low fluid level', 'Dirty / burnt fluid'],
  'Gear selector': ['Hard to move', 'Loose', 'Position indicator not working'],
  'Unusual noise': ['Whining noise', 'Clunking noise', 'Grinding noise'],
  'Gear shifting': ['Delayed shifting', 'Harsh shifting', 'Slipping', 'Transmission warning light'],
};
// leak sources: [title shown in the report, explanation + labour cost]
export const LEAK_DETAILS = {
  'Oil pan gasket': ['Leak from oil pan gasket', 'The oil pan is a reservoir at the bottom of the engine that collects and stores engine oil, which has a leak. This means the seal between the oil pan and the engine is damaged or worn out, causing oil to leak out. Long term oil pan leaks can be dangerous for engine life span. Labor cost: Medium'],
  'Valve cover / camshaft gasket': ['Leak from valve cover/camshaft gasket', 'The valve cover gasket is a seal that is placed between the valve cover and the cylinder head of an engine. Its main purpose is to prevent oil leaks from the valve cover. A leak from the valve cover or camshaft gasket means the seal between the valve cover or camshaft cover and the engine is damaged or worn out, causing oil to leak. Long term oil leaks can be dangerous for engine life span. Labor cost: High'],
  'Oil drain plug': ['Leak from oil drain plug', "A leak from the oil drain plug indicates that the plug, which is used to drain the engine oil during an oil change, may not be tightened properly or the gasket/seal around the plug is damaged. It's crucial to address this promptly to prevent oil loss and potential engine damage. Labor cost: Low To Medium"],
  'Timing cover gasket': ['Leak from timing cover gasket', 'A leak from the timing cover indicates that the seal around the cover protecting the timing belt or chain is failing, leading to oil leakage. Long term oil leaks can be dangerous for engine life span. Labor cost: High'],
  'Rear main seal': ['Leak from engine rear main seal', 'A leak from the engine rear main seal indicates a failure in the seal between the engine and the transmission, allowing oil to escape. If left unaddressed, it can lead to oil depletion and potential engine damage. Labor cost: High'],
  'Oil filter housing': ['Leak from oil filter housing', 'Oil is leaking around the oil filter housing or its seal. Labor cost: Low To Medium'],
  'Transmission pan': ['Leak from Transmission pan', 'Transmission fluid leak found. Transmission fluid leaks can result from damaged seals, gaskets, or transmission pan, leading to low fluid levels, overheating, and potential transmission failure. Note: It is impossible to estimate the transmission life. Labor cost: Low to High'],
  'Input / output seal': ['Leak from transmission input / output seal', 'Fluid is leaking where the drive shaft or axle leaves the transmission. Labor cost: Medium'],
  'Cooler lines': ['Leak from transmission cooler lines', 'Fluid is leaking from the lines that carry transmission fluid to the cooler. Labor cost: Low to Medium'],
  'Axle seals': ['Leak from axle seals', 'Fluid is leaking from the axle seals at the transmission. Labor cost: Medium'],
};
const pf = (id, label, extra = {}) => ({ id, label, type: 'pf', ...(FINDINGS[label] ? { defects: FINDINGS[label] } : {}), ...extra });
export const findingLabel = (d) => (typeof d === 'string' ? d : d.label);
export const findingDescription = (d) => (typeof d === 'string' ? '' : d.description ?? '');

export const SECTIONS = [
  {
    id: 'summary', title: 'Vehicle Summary', icon: 'Car',
    items: [
      { id: 'vin', label: 'VIN / chassis number', type: 'text', req: true, placeholder: 'e.g. WDB2304701F157232' },
      { id: 'odometer', label: 'Odometer reading (km)', type: 'number', req: true },
      { id: 'regionalSpecs', label: 'Regional specs', type: 'select', options: market.specs },
      { id: 'transmissionType', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual', 'CVT', 'DCT', 'Other'] },
      { id: 'engineSize', label: 'Engine size', type: 'select', options: ['3-Cylinder', '4-Cylinder', '5-Cylinder', '6-Cylinder', '8-Cylinder', '10-Cylinder', '12-Cylinder', 'Electric motor', 'Other'] },
      { id: 'interiorType', label: 'Interior', type: 'select', options: ['Leather', 'Fabric', 'Mixed', 'Alcantara', 'Other'] },
      { id: 'spareTyre', label: 'Spare tyre', type: 'select', options: ['Available', 'Not available', 'Repair kit'] },
      { id: 'keys', label: 'Number of keys', type: 'select', options: ['1', '2', '3+'] },
      { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Pickup', 'Van', 'Other'] },
      { id: 'colour', label: 'External colour', type: 'text' },
    ],
  },
  {
    id: 'tyres', title: 'Tyres, Rims, Brakes & Suspension', icon: 'CircleDot',
    items: [
      ...tyres, ...rims, ...brakes,
      { id: 'tbeReport', sub: 'Brakes', label: 'TBE test report', type: 'files' },
      pf('abs', 'ABS sensors', { sub: 'Brakes' }), pf('handbrake', 'Handbrake', { sub: 'Brakes' }),
      pf('frontSusp', 'Front suspension', { sub: 'Suspension' }), pf('rearSusp', 'Rear suspension', { sub: 'Suspension' }),
    ],
  },
  {
    id: 'interior', title: 'Interior', icon: 'Armchair',
    items: INTERIOR_PARTS.map((p, i) => pf(`int${i + 1}`, p, { no: i + 1 })),
  },
  {
    id: 'electrical', title: 'Electrical', icon: 'Zap',
    items: [
      'Key', 'Infotainment', 'Windows operation', 'Seats adjustment', 'Door lock', 'A/C control & cooling', 'Centre console buttons', 'Cameras', 'Gauges',
      'Rear view / side mirrors', 'A/C grilles', 'Ignition system', 'Brake lights', 'Headlights', 'Fog lights', 'Reverse lights', 'Number plate lights',
      'Indicators & hazards', 'Wipers', 'Soft-closing doors', 'Sunroof / moonroof', 'Interior lights', 'Cruise control', 'Horn', 'Parking sensors', 'Battery health',
    ].map((l, i) => pf(`el${i + 1}`, l)),
  },
  {
    id: 'exterior', title: 'Exterior', icon: 'PaintBucket',
    items: PANELS.map(([id, label]) => ({ id, label, type: 'panel' })),
  },
  {
    id: 'engine', title: 'Engine', icon: 'Cog',
    items: [
      'Engine upper cover', 'Engine shield cover', 'Engine mounts', 'Bonnet hinge & holder', 'Turbo / supercharger', 'Fender liners', 'Drive belt / pulleys',
      'Engine idle', 'Engine oil filler cap', 'Radiator',
    ].map((l, i) => pf(`en${i + 1}`, l))
      .concat([
        { id: 'oilLeaks', label: 'Engine oil leaks', type: 'multi', options: ['Oil pan gasket', 'Valve cover / camshaft gasket', 'Oil drain plug', 'Timing cover gasket', 'Rear main seal', 'Oil filter housing'] },
        pf('oilCond', 'Engine oil condition'), pf('coolantCond', 'Coolant condition'), pf('coolantCap', 'Coolant cap'), pf('hoses', 'Hoses & pipes'),
        pf('exhaust', 'Exhaust system'), pf('rust', 'Visible rust'), pf('waterMarks', 'Water scaling / dirt marks'),
      ]),
  },
  {
    id: 'transmission', title: 'Transmission', icon: 'Settings2',
    items: [
      pf('transFluid', 'Transmission fluid level & condition'),
      { id: 'transLeaks', label: 'Transmission fluid leaks', type: 'multi', options: ['Transmission pan', 'Input / output seal', 'Cooler lines', 'Axle seals'] },
      pf('gearSelector', 'Gear selector'), pf('transNoise', 'Unusual noise'), pf('gearShifting', 'Gear shifting'),
    ],
  },
  {
    id: 'chassis', title: 'Chassis or Subframe', icon: 'Layers',
    items: CHASSIS_POINTS.map((l, i) => ({ id: `ch${i + 1}`, label: l, type: 'select', options: ['Checked', 'Repaired', 'Damaged'], defects: CHASSIS_DEFECTS, no: i + 1 })),
  },
  {
    id: 'diagnostics', title: 'Diagnostic Report', icon: 'Activity',
    items: [
      pf('preScan', 'Pre-test-drive OBD scan clear', { sub: 'Pre test drive' }),
      { id: 'preDriveFiles', sub: 'Pre test drive', label: 'Pre test drive report', type: 'files' },
      { id: 'dtcPre', sub: 'Pre test drive', label: 'Fault codes found', type: 'text', placeholder: 'e.g. P0301, P0420 – or "none"' },
      pf('roadTest', 'Road test satisfactory', { sub: 'Road test' }),
      { id: 'roadNotes', sub: 'Road test', label: 'Road test notes', type: 'text', placeholder: 'Pulling, noises, vibrations…' },
      pf('postScan', 'Post-test-drive OBD scan clear', { sub: 'Post test drive' }),
      { id: 'postDriveFiles', sub: 'Post test drive', label: 'Post test drive report', type: 'files' },
      { id: 'dtcPost', sub: 'Post test drive', label: 'Fault codes found', type: 'text', placeholder: 'e.g. none' },
      { id: 'extraInfo', sub: 'Additional information', label: 'Additional information', type: 'text' },
    ],
  },
];

// tyres, rims and brakes are generated above before the findings table exists, so attach their standard findings here
SECTIONS.forEach((sec) => sec.items.forEach((it) => { if (it.type === 'pf' && !it.defects && FINDINGS[it.label]) it.defects = FINDINGS[it.label]; }));

export const sectionById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
export const sectionsForPlan = (plan) => SECTIONS.filter((s) => plan.sections.includes(s.id));

export const GOOD_OPTIONS = new Set(['Checked', 'Original']);
export const BAD_OPTIONS = new Set(['Repaired', 'Damaged', 'Cosmetic paint', 'Faded paint', 'Accident paint']);
export const isGradedType = (it) => it.type === 'pf' || it.type === 'panel' || it.type === 'multi' || (it.type === 'select' && it.options.some((o) => GOOD_OPTIONS.has(o) || BAD_OPTIONS.has(o)));

export const isAnswered = (cell) => {
  const v = cell?.v;
  return v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && Number.isNaN(v));
};

// -> 'pass' | 'fail' | 'na' | null (ungraded / unanswered)
export function gradeItem(it, cell) {
  if (!isAnswered(cell)) return null;
  const v = cell.v;
  if (it.type === 'pf') return v === 'pass' ? 'pass' : v === 'fail' ? 'fail' : 'na';
  if (it.type === 'multi') return Array.isArray(v) && v.length ? 'fail' : 'pass';
  if (it.type === 'panel') return v === 'Original' && !(cell.defects?.length) ? 'pass' : v === 'Original' ? 'fail' : BAD_OPTIONS.has(v) ? 'fail' : null;
  if (it.type === 'select') return GOOD_OPTIONS.has(v) ? 'pass' : BAD_OPTIONS.has(v) ? 'fail' : null;
  return null;
}

export const countCheckpoints = (sectionIds) => SECTIONS.filter((s) => sectionIds.includes(s.id)).reduce((n, s) => n + s.items.filter(isGradedType).length, 0);

export function itemTotals(plan, data = {}) {
  let pass = 0; let fail = 0; let na = 0; let answered = 0; let required = 0;
  sectionsForPlan(plan).forEach((s) => s.items.forEach((it) => {
    const needs = isGradedType(it) || it.req;
    if (needs) {
      required++;
      if (isAnswered(data[s.id]?.[it.id])) answered++;
    }
    const g = gradeItem(it, data[s.id]?.[it.id]);
    if (g === 'pass') pass++; else if (g === 'fail') fail++; else if (g === 'na') na++;
  }));
  const graded = pass + fail;
  return {
    pass, fail, na, filled: answered, total: required, graded,
    score: graded ? Math.round((pass / graded) * 100) : 0,
    progress: required ? Math.round((answered / required) * 100) : 0,
  };
}

export function verdict(score) {
  if (score >= 90) return { label: 'Excellent', tone: 'green', text: 'Excellent condition overall' };
  if (score >= 78) return { label: 'Good', tone: 'blue', text: 'Good condition, minor items noted' };
  if (score >= 62) return { label: 'Fair', tone: 'amber', text: 'Several items need attention' };
  return { label: 'Poor', tone: 'red', text: 'Significant issues found – review carefully' };
}

// Items needed before an inspection can be ended
export function missingItems(plan, data = {}) {
  const out = [];
  sectionsForPlan(plan).forEach((s) => {
    const open = s.items.filter((it) => (isGradedType(it) || it.req) && !isAnswered(data[s.id]?.[it.id])).length;
    if (open) out.push(`${s.title}: ${open} item${open > 1 ? 's' : ''} unanswered`);
  });
  return out;
}

// A quick "all good" fill for a section – inspector then flips the exceptions.
export function passAllValues(section, current = {}) {
  const next = { ...current };
  section.items.forEach((it) => {
    if (isAnswered(next[it.id])) return;
    if (it.type === 'pf') next[it.id] = { v: 'pass' };
    else if (it.type === 'panel') next[it.id] = { v: 'Original', defects: [] };
    else if (it.type === 'multi') next[it.id] = { v: [] };
    else if (it.type === 'select' && it.options.includes('Checked')) next[it.id] = { v: 'Checked' };
  });
  return next;
}

// Carbon footprint estimate (tonnes CO2e) = odometer km x emission factor (kg CO2e per km) / 1000, shown on the summary page.
const PETROL = { 3: 0.17, 4: 0.21, 5: 0.25, 6: 0.30, 8: 0.42, 10: 0.48, 12: 0.52 };
const DIESEL = { 3: 0.16, 4: 0.19, 5: 0.22, 6: 0.26, 8: 0.33, 10: 0.38, 12: 0.40 };
export function carbonFootprint(odometer, fuel, engineSize) {
  const km = parseFloat(String(odometer ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(km) || km <= 0) return null;
  const fl = String(fuel ?? '').toLowerCase();
  const cyl = parseInt(String(engineSize ?? '').replace(/[^0-9]/g, ''), 10);
  let factor;
  if (fl.includes('electric')) factor = 0.07;
  else if (fl.includes('plug')) factor = 0.10;
  else if (fl.includes('hybrid')) factor = 0.14;
  else {
    const table = fl.includes('diesel') ? DIESEL : PETROL;
    const known = Object.keys(table).map(Number);
    factor = !cyl ? table[4] : table[known.reduce((b, k) => (Math.abs(k - cyl) < Math.abs(b - cyl) ? k : b), known[0])];
  }
  return { tonnes: Math.round(((km * factor) / 1000) * 100) / 100, rating: Math.max(0, Math.min(1, (factor - 0.05) / 0.45)) };
}
