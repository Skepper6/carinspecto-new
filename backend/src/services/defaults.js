import { Plan } from '../models/index.js';
import { market } from '../config/market.js';

// Prices excl. tax per market. Only used to create the plans on a brand-new database; after that the admin edits them in the portal.
const PRICES = { uae: { basic: 249, standard: 399, premium: 599 }, in: { basic: 1799, standard: 2999, premium: 4499 } };

const DEFAULT_PLANS = [
  {
    key: 'basic', name: 'Essential', checkpoints: 55, duration: '60 min', color: '#2ea6a0',
    tagline: 'Body, tyres and interior health check',
    sections: ['summary', 'tyres', 'interior', 'exterior'],
    features: ['Vehicle summary', 'Tyres, rims, brakes & suspension', 'Interior & exterior paint check', 'Photo-backed PDF report'],
  },
  {
    key: 'standard', name: 'Standard', checkpoints: 104, duration: '90 min', color: '#3a2a8c', popular: true,
    tagline: 'Our most chosen plan for a thorough check',
    sections: ['summary', 'tyres', 'interior', 'exterior', 'electrical', 'engine', 'transmission'],
    features: ['Everything in Essential', 'Electrical systems', 'Engine bay, leaks & transmission', 'Inspector call-back'],
  },
  {
    key: 'premium', name: 'Premium', checkpoints: 129, duration: '2 hrs', color: '#f58220',
    tagline: 'Full inspection incl. chassis, OBD scan & road test',
    sections: ['summary', 'tyres', 'interior', 'exterior', 'electrical', 'engine', 'transmission', 'chassis', 'diagnostics'],
    features: ['Everything in Standard', 'Chassis / subframe check', 'Pre & post-drive OBD diagnostics', 'Road test & priority scheduling'],
  },
];

// A fresh database has no plans, so nobody could book. Create the three standard plans once; never touches existing ones.
export async function ensureDefaultPlans() {
  if (await Plan.estimatedDocumentCount()) return;
  const prices = PRICES[market.code] ?? PRICES.uae;
  await Plan.insertMany(DEFAULT_PLANS.map((p, order) => ({ ...p, price: prices[p.key], order })));
  console.log('No plans found - created the default plans.');
}
