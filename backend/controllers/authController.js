const pool = require('../db');
const crypto = require('crypto');

// const activeTokens = new Map(); // Removed in-memory storage
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Create sessions table if it doesn't exist
const createSessionsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    console.log('Sessions table ensured');
  } catch (error) {
    console.error('Error creating sessions table:', error);
  }
};

// Initialize table creation
createSessionsTable();

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
  
  // Store in database
  await pool.query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );
  
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
  
  try {
    const result = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE token = $1',
      [token]
    );
    
    if (result.rows.length === 0) return null;
    
    const { user_id, expires_at } = result.rows[0];
    
    // Check if token is expired
    if (Date.now() > new Date(expires_at).getTime()) {
      // Delete expired token
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      return null;
    }
    
    return { userId: user_id, expiresAt: expires_at };
  } catch (error) {
    console.error('Error resolving session:', error);
    return null;
  }
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
  
  // Remove from database
  if (token) {
    try {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
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
