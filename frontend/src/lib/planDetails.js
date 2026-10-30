import { SECTIONS, countCheckpoints } from './inspectionSchema';

// What the inspector actually checks in each section (mirrors the inspection form in inspectionSchema.js).
const CHECKS = {
  summary: ['VIN / chassis number and odometer reading', 'Transmission, engine size, interior and regional specs', 'Keys, spare tyre and overall vehicle identity'],
  tyres: ['Tyre condition, make, size and manufacturing date on every wheel', 'Rim condition and original vs aftermarket', 'Brake pads, discs / drums, ABS sensors and handbrake', 'Front and rear suspension, shocks and bushes', 'Brake (TBE) test report attached'],
  interior: ['Seats, dashboard, roof lining, steering wheel and gear lever', 'Doors, floor mats, trunk lining, sun visors and mirrors', 'Windscreens and side windows for chips and cracks'],
  exterior: ['Paint check on all 14 body panels (original, repainted, accident paint)', 'Scratches, chips, dents and cracks marked on a top-view car map', 'Bumpers, bonnet, roof, doors and fenders'],
  electrical: ['Headlights, indicators, brake, fog and reverse lights', 'A/C cooling, infotainment, cameras and parking sensors', 'Windows, central locking, seat adjustment and sunroof', 'Gauges, warning lights, wipers, horn and cruise control', 'Battery health and ignition / starting'],
  engine: ['Engine idle, mounts, belts, pulleys and turbo', 'Oil, coolant and radiator condition', 'Six oil-leak points (sump, valve cover, timing cover, rear seal…)', 'Hoses, exhaust, visible rust and flood / water marks'],
  transmission: ['Transmission fluid level and condition', 'Gear shifting, selector and unusual noises', 'Four fluid-leak points (pan, seals, cooler lines, axles)'],
  chassis: ['22 structural points: pillars (A, B, C), door sills and floor boards', 'Frame rails, core support, shock towers and fender aprons', 'Each point marked checked, repaired or damaged, with repair / welding / rust flags'],
  diagnostics: ['OBD fault-code scan before the test drive', 'Road test: pulling, noises and vibrations', 'OBD scan again after the drive, with both reports attached'],
};

// Plan-level extras and limits, shown under the checks. Keyed by plan id.
const EXTRAS = {
  basic: {
    best: 'A quick health check on a newer or low-risk car.',
    includes: ['Photo-backed PDF report in your dashboard', 'Photos for every issue found', 'Inspector visits your location'],
    notIncluded: ['Engine bay and leak checks', 'Electrical systems', 'Chassis / structural check', 'OBD scan and road test'],
  },
  standard: {
    best: 'Most used cars: a thorough check of the body, engine and electrics.',
    includes: ['Everything in Essential', 'Photo-backed PDF report in your dashboard', 'Inspector call-back to talk through the findings'],
    notIncluded: ['Chassis / structural check', 'OBD scan and road test'],
  },
  premium: {
    best: 'Higher-value, older or imported cars, and any car with a doubtful history.',
    includes: ['Everything in Standard', 'Photo-backed PDF report in your dashboard', 'Inspector call-back to talk through the findings', 'Priority scheduling'],
    notIncluded: [],
  },
};

// Full breakdown of a plan: one group per inspection section it covers, plus facts, extras and limits.
export function planDetails(plan) {
  const ids = plan.sections ?? [];
  const groups = SECTIONS.filter((s) => ids.includes(s.id)).map((s) => ({
    id: s.id,
    title: s.title,
    count: countCheckpoints([s.id]),
    items: CHECKS[s.id] ?? [],
  }));
  return { groups, ...(EXTRAS[plan.id] ?? { best: '', includes: plan.features ?? [], notIncluded: [] }) };
}
