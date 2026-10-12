import User from '../models/User.js';
import { readToken, verifyToken } from '../utils/token.js';

// Loads the signed-in user fresh from the DB, so a suspension takes effect immediately.
export async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const { sub, iat } = verifyToken(token);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ error: 'Please sign in.' });
    // a password change or reset signs every older session out
    if (user.passwordChangedAt && iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) return res.status(401).json({ error: 'Your password was changed. Please sign in again.' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export const requireRole = (...roles) => (req, res, next) => (
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'You do not have access to this.' })
);
