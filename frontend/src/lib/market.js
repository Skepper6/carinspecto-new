import uae from '../markets/uae';
import india from '../markets/in';

const markets = { uae, in: india };

// Set VITE_MARKET in the build env for each deployment (uae or in). Defaults to UAE.
export const market = markets[import.meta.env.VITE_MARKET || 'uae'];
if (!market) throw new Error(`Unknown VITE_MARKET "${import.meta.env.VITE_MARKET}". Use "uae" or "in".`);
