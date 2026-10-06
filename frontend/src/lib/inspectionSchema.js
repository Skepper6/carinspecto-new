// Structured inspection checklist modelled on a professional pre-purchase report.
// Item types:  pf (pass / fail / n-a)  ·  select  ·  number  ·  text
//              panel (paint state + defects + paint thickness)  ·  multi (pick any: e.g. leak sources)
// Items may carry `sub` (sub-heading, e.g. "Tyres") and `group` (e.g. "Front Left (FL)").
// Stored value shape: data[sectionId][itemId] = { v, note, photos: [dataUrl], defects: [], micron }

const WHEELS = [['FL', 'Front Left (FL)'], ['FR', 'Front Right (FR)'], ['RL', 'Rear Left (RL)'], ['RR', 'Rear Right (RR)']];
const WHEELS_ST = [...WHEELS, ['ST', 'Spare tyre (ST)']];

const tyres = WHEELS_ST.flatMap(([k, g]) => [
  { id: `tyre${k}`, sub: 'Tyres', group: g, label: 'Tyre condition', type: 'pf' },
  { id: `tyreMake${k}`, sub: 'Tyres', group: g, label: 'Tyre manufacturer', type: 'text', placeholder: 'e.g. Michelin' },
  { id: `tyreDate${k}`, sub: 'Tyres', group: g, label: 'Manufacturing date', type: 'text', placeholder: 'MM-YYYY' },
  { id: `tyreSize${k}`, sub: 'Tyres', group: g, label: 'Tyre size', type: 'text', placeholder: '255/35ZR19' },
]);
const rims = WHEELS_ST.flatMap(([k, g]) => [
  { id: `rim${k}`, sub: 'Rims', group: g, label: 'Rim condition', type: 'pf' },
  { id: `rimBrand${k}`, sub: 'Rims', group: g, label: 'Rim brand', type: 'text' },
  { id: `rimType${k}`, sub: 'Rims', group: g, label: 'Rim type', type: 'select', options: ['OEM (original)', 'Aftermarket'] },
]);
const brakes = WHEELS.flatMap(([k, g]) => [
  { id: `brakeType${k}`, sub: 'Brakes', group: g, label: 'Brake type', type: 'select', options: ['Disc', 'Drum'] },
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
const pf = (id, label, extra = {}) => ({ id, label, type: 'pf', ...extra });

export const SECTIONS = [
  {
    id: 'summary', title: 'Vehicle Summary', icon: 'Car',
    items: [
      { id: 'vin', label: 'VIN / chassis number', type: 'text', req: true, placeholder: 'e.g. WDB2304701F157232' },
      { id: 'odometer', label: 'Odometer reading (km)', type: 'number', req: true },
      { id: 'regionalSpecs', label: 'Regional specs', type: 'select', options: ['GCC', 'American', 'Japanese', 'European', 'Canadian', 'Korean', 'Chinese', 'Other'] },
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
        { id: 'oilLeaks', label: 'Engine oil leaks', type: 'multi', options: ['Oil pan gasket', 'Valve cover / camshaft gasket', 'Oil drain plug', 'Timing cover gasket', 'Rear main seal'] },
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
    items: CHASSIS_POINTS.map((l, i) => ({ id: `ch${i + 1}`, label: l, type: 'select', options: ['Checked', 'Repaired', 'Damaged'], no: i + 1 })),
  },
  {
    id: 'diagnostics', title: 'Diagnostic Report', icon: 'Activity',
    items: [
      pf('preScan', 'Pre-test-drive OBD scan clear', { sub: 'Pre test drive' }),
      { id: 'dtcPre', sub: 'Pre test drive', label: 'Fault codes found', type: 'text', placeholder: 'e.g. P0301, P0420 – or "none"' },
      pf('roadTest', 'Road test satisfactory', { sub: 'Road test' }),
      { id: 'roadNotes', sub: 'Road test', label: 'Road test notes', type: 'text', placeholder: 'Pulling, noises, vibrations…' },
      pf('postScan', 'Post-test-drive OBD scan clear', { sub: 'Post test drive' }),
      { id: 'dtcPost', sub: 'Post test drive', label: 'Fault codes found', type: 'text', placeholder: 'e.g. none' },
      { id: 'extraInfo', sub: 'Additional information', label: 'Additional information', type: 'text' },
    ],
  },
];

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
