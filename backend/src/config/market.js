import uae from './markets/uae.js';
import india from './markets/in.js';

const markets = { uae, in: india };

// Each deployment sets MARKET in its own env file. Defaults to UAE so the existing setup keeps working.
export const market = markets[process.env.MARKET || 'uae'];
if (!market) throw new Error(`Unknown MARKET "${process.env.MARKET}". Use "uae" or "in".`);
