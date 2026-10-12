import jwt from 'jsonwebtoken';

// Login tokens are sent in the Authorization header (kept per browser tab on the client), so admin, customer and
// inspector can be signed in side by side and there are no cookies to forge across sites.
const secret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set (32+ characters)');
  return process.env.JWT_SECRET;
};

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: '7d' });
export const verifyToken = (token) => jwt.verify(token, secret());
export const readToken = (req) => {
  const h = req.get('authorization');
  return h && /^Bearer /i.test(h) ? h.slice(7).trim() : null;
};
