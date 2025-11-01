const pool = require('../db');
const crypto = require('crypto');

const activeTokens = new Map(); // Fallback in-memory storage
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const sanitizeProfile = (profile) => {
  if (!profile) return null;
  const { password, ...rest } = profile;
  return rest;
};

const hashPassword = (password) =>
  crypto.createHash('sha256').update(String(password)).digest('hex');

const issueToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  
  // Store in-memory
  activeTokens.set(token, { userId, expiresAt });
  
  return token;
};

const extractToken = (req) => {
  const authHeader = req.headers?.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const resolveSession = async (token) => {
  if (!token) return null;
  
  // Check in-memory storage
  const session = activeTokens.get(token);
  if (!session) return null;
  
  // Check if token is expired
  if (Date.now() > session.expiresAt.getTime()) {
    activeTokens.delete(token);
    return null;
  }
  
  return session;
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM profiles WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const profile = result.rows[0];
    const hashed = hashPassword(password);
    if (profile.password !== hashed) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = await issueToken(profile.id);
    return res.json({ token, user: sanitizeProfile(profile) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  const token = extractToken(req);
  
  // Remove from in-memory storage
  if (token) {
    activeTokens.delete(token);
  }
  
  return res.json({ success: true });
};

exports.getCurrentUser = async (req, res) => {
  try {
    const token = extractToken(req);
    const session = await resolveSession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const result = await pool.query('SELECT * FROM profiles WHERE id = $1 LIMIT 1', [
      session.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.json({ user: sanitizeProfile(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
