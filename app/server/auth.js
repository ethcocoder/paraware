import crypto from 'node:crypto';
import { get } from './db.js';

const SECRET =
  process.env.PARAWARE_SECRET ||
  'paraware-pilot-local-secret-change-this-before-production';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

export function createToken(user) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Date.now() + TOKEN_TTL_MS,
    })
  );
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    const user = get(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.department_id,
              u.language, u.created_at, d.name AS department_name
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = ?`,
      data.sub
    );
    return user || null;
  } catch {
    return null;
  }
}

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = verifyToken(token);
  if (!user) {
    const error = new Error('Please sign in to continue.');
    error.status = 401;
    return next(error);
  }
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      const error = new Error('Please sign in to continue.');
      error.status = 401;
      return next(error);
    }
    if (!roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to do that.');
      error.status = 403;
      return next(error);
    }
    next();
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    departmentId: user.department_id,
    departmentName: user.department_name || null,
    language: user.language,
    createdAt: user.created_at,
  };
}
