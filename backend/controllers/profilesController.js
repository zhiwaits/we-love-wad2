const pool = require('../db');
const table = "profiles";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.checkAvailability = async (req, res) => {
  try {
    const { email, username } = req.query;

    if (!email && !username) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    let emailTaken = false;
    let usernameTaken = false;

    if (email) {
      const emailResult = await pool.query(
        `SELECT 1 FROM ${table} WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      );
      emailTaken = emailResult.rows.length > 0;
    }

    if (username) {
      const usernameResult = await pool.query(
        `SELECT 1 FROM ${table} WHERE LOWER(username) = LOWER($1) LIMIT 1`,
        [username]
      );
      usernameTaken = usernameResult.rows.length > 0;
    }

    res.json({ emailTaken, usernameTaken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllProfiles = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table}`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllUserProfiles = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE account_type = 'user'`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllClubProfiles = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE account_type = 'club'`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfileById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createUserProfile = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email, and password are required' });
    }
    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');
    const result = await pool.query(
      `INSERT INTO ${table} (name, username, email, password, account_type)
       VALUES ($1, $2, $3, $4, 'user') RETURNING *`,
      [name, username, email, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createClubProfile = async (req, res) => {
  try {
    const { name, username, email, password, club_description, club_category_id, imageBase64, imageOriginalName } = req.body;
    if (!username || !email || !password || !club_description || !club_category_id) {
      return res.status(400).json({ error: 'Missing required fields for club profile' });
    }

    let storedImageUrl = null;
    if (imageBase64 && imageOriginalName) {
      const uploadDir = path.resolve(__dirname, '../uploads/club');
      try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

      const safeUsername = (username || 'club')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'club';

      const fileName = `${safeUsername}.png`;
      const filePath = path.join(uploadDir, fileName);
      try { fs.unlinkSync(filePath); } catch {}
      const data = imageBase64.split(',')[1] || imageBase64;
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      storedImageUrl = `/uploads/club/${fileName}`;
    }

    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');

    const result = await pool.query(
      `INSERT INTO ${table} (name, username, email, password, club_description, club_category_id, club_image, account_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'club') RETURNING *`,
      [name, username, email, passwordHash, club_description, club_category_id, storedImageUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const {
    username, email, password
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ${table} SET username=$1, email=$2, password=$3 WHERE id=$4 AND account_type='user' RETURNING *`,
      [username, email, password, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateClubProfile = async (req, res) => {
  const { id } = req.params;
  const {
    name, username, email, password, club_description, club_category_id, club_image, imageBase64, imageOriginalName
  } = req.body;
  
  try {
    // First, get the current profile to check if username changed
    const currentProfileResult = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND account_type = 'club'`, [id]);
    if (currentProfileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club profile not found' });
    }
    const currentProfile = currentProfileResult.rows[0];
    
    let storedImageUrl = club_image; // Keep existing image by default
    
    // Handle username change - rename existing image file if username changed and no new image provided
    if (username && username !== currentProfile.username && !imageBase64) {
      const uploadDir = path.resolve(__dirname, '../uploads/club');
      
      const oldSafeUsername = (currentProfile.username || 'club')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'club';
      
      const newSafeUsername = (username || 'club')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'club';
      
      if (oldSafeUsername !== newSafeUsername) {
        const oldFileName = `${oldSafeUsername}.png`;
        const newFileName = `${newSafeUsername}.png`;
        const oldFilePath = path.join(uploadDir, oldFileName);
        const newFilePath = path.join(uploadDir, newFileName);
        
        try {
          // Check if old file exists and rename it
          if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, newFilePath);
            storedImageUrl = `/uploads/club/${newFileName}`;
          }
        } catch (error) {
          console.error('Error renaming club image file:', error);
          // Continue with update even if rename fails
        }
      }
    }
    
    // Handle new image upload if provided
    if (imageBase64 && imageOriginalName) {
      const uploadDir = path.resolve(__dirname, '../uploads/club');
      try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

      const safeUsername = (username || 'club')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'club';

      const fileName = `${safeUsername}.png`;
      const filePath = path.join(uploadDir, fileName);
      try { fs.unlinkSync(filePath); } catch {} // Remove old file
      const data = imageBase64.split(',')[1] || imageBase64;
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      storedImageUrl = `/uploads/club/${fileName}`;
    }

    // Handle password - only hash if provided
    let passwordValue = password;
    if (password) {
      passwordValue = crypto.createHash('sha256').update(String(password)).digest('hex');
    }

    // Build dynamic query based on whether password is being updated
    let query, params;
    if (passwordValue) {
      query = `UPDATE ${table} SET name=$1, username=$2, email=$3, password=$4, club_description=$5, club_category_id=$6, club_image=$7 WHERE id=$8 AND account_type='club' RETURNING *`;
      params = [name, username, email, passwordValue, club_description, club_category_id, storedImageUrl, id];
    } else {
      query = `UPDATE ${table} SET name=$1, username=$2, email=$3, club_description=$4, club_category_id=$5, club_image=$6 WHERE id=$7 AND account_type='club' RETURNING *`;
      params = [name, username, email, club_description, club_category_id, storedImageUrl, id];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Club profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteProfile = async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json({ message: 'Profile deleted', profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};