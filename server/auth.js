import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserById } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'suno_music_jwt_secret_key_2026';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, userId: user.user_id || user.userId, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Middleware: Strictly requires valid authentication
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const user = await getUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = user;
  next();
}

/**
 * Middleware: Optional authentication (attaches user if token present)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      const user = await getUserById(decoded.id);
      if (user) req.user = user;
    }
  }
  next();
}
