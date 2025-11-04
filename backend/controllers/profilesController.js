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
  const client = await pool.connect();
  try {
    const { name, username, email, password, preferred_categories, preferred_tags } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email, and password are required' });
    }
    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');

    await client.query('BEGIN');

    // Insert user profile without preference arrays
    const result = await client.query(
      `INSERT INTO ${table} (name, username, email, password, account_type)
       VALUES ($1, $2, $3, $4, 'user') RETURNING *`,
      [name, username, email, passwordHash]
    );

    const userId = result.rows[0].id;

    // Insert category preferences if provided
    if (Array.isArray(preferred_categories) && preferred_categories.length > 0) {
      for (const category of preferred_categories) {
        await client.query(
          'INSERT INTO category_preference (userid, category) VALUES ($1, $2)',
          [userId, category.toLowerCase()]
        );
      }
    }

    // Insert tag preferences if provided
    if (Array.isArray(preferred_tags) && preferred_tags.length > 0) {
      for (const tagName of preferred_tags) {
        // Find or create tag
        const tagResult = await client.query(
          'SELECT id FROM event_tags WHERE LOWER(tag_name) = LOWER($1)',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length > 0) {
          tagId = tagResult.rows[0].id;
        } else {
          // Create new tag if it doesn't exist
          const newTag = await client.query(
            'INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING id',
            [tagName.toLowerCase()]
          );
          tagId = newTag.rows[0].id;
        }

        await client.query(
          'INSERT INTO tag_preference (userid, tagid) VALUES ($1, $2)',
          [userId, tagId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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

exports.getClubStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Get total events count
    const totalEventsQuery = `SELECT COUNT(*) as total FROM events WHERE owner_id = $1`;
    const totalEventsResult = await pool.query(totalEventsQuery, [id]);
    const totalEvents = parseInt(totalEventsResult.rows[0].total);

    // Get upcoming events count (events with datetime > now)
    const upcomingEventsQuery = `SELECT COUNT(*) as upcoming FROM events WHERE owner_id = $1 AND datetime > NOW()`;
    const upcomingEventsResult = await pool.query(upcomingEventsQuery, [id]);
    const upcomingEvents = parseInt(upcomingEventsResult.rows[0].upcoming);

    res.json({
      totalEvents,
      upcomingEvents
    });
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

// Get user preferences (categories and tags)
exports.getUserPreferences = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and is a user account
    const userCheck = await pool.query(
      `SELECT id FROM ${table} WHERE id = $1 AND account_type = 'user'`,
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get event categories from category_preference table
    const categoriesResult = await pool.query(
      `SELECT category FROM category_preference WHERE userid = $1`,
      [id]
    );

    // Get tags from tag_preference table (need to join with event_tags to get tag names)
    const tagsResult = await pool.query(
      `SELECT et.tag_name
       FROM tag_preference tp
       JOIN event_tags et ON tp.tagid = et.id
       WHERE tp.userid = $1`,
      [id]
    );

    const preferences = {
      preferred_categories: categoriesResult.rows.map(row => row.category),
      preferred_tags: tagsResult.rows.map(row => row.tag_name)
    };

    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user preferences (categories and tags)
exports.updateUserPreferences = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { preferred_categories, preferred_tags } = req.body;

    // Validate that arrays are provided
    if (!Array.isArray(preferred_categories) || !Array.isArray(preferred_tags)) {
      return res.status(400).json({ error: 'preferred_categories and preferred_tags must be arrays' });
    }

    // Validate minimum and maximum limits (3-10 total preferences)
    const totalPreferences = preferred_categories.length + preferred_tags.length;
    if (totalPreferences < 3) {
      return res.status(400).json({ error: 'Please select at least 3 preferences (categories or tags combined)' });
    }
    if (totalPreferences > 10) {
      return res.status(400).json({ error: 'Please select no more than 10 preferences (categories or tags combined)' });
    }

    // Check if user exists
    const userCheck = await client.query(
      `SELECT id FROM ${table} WHERE id = $1 AND account_type = 'user'`,
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    await client.query('BEGIN');

    // Delete existing preferences
    await client.query('DELETE FROM category_preference WHERE userid = $1', [id]);
    await client.query('DELETE FROM tag_preference WHERE userid = $1', [id]);

    // Insert new category preferences
    for (const category of preferred_categories) {
      await client.query(
        'INSERT INTO category_preference (userid, category) VALUES ($1, $2)',
        [id, category.toLowerCase()]
      );
    }

    // Insert new tag preferences
    for (const tagName of preferred_tags) {
      // Find or create tag
      const tagResult = await client.query(
        'SELECT id FROM event_tags WHERE LOWER(tag_name) = LOWER($1)',
        [tagName]
      );

      let tagId;
      if (tagResult.rows.length > 0) {
        tagId = tagResult.rows[0].id;
      } else {
        // Create new tag if it doesn't exist
        const newTag = await client.query(
          'INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING id',
          [tagName.toLowerCase()]
        );
        tagId = newTag.rows[0].id;
      }

      await client.query(
        'INSERT INTO tag_preference (userid, tagid) VALUES ($1, $2)',
        [id, tagId]
      );
    }

    await client.query('COMMIT');

    res.json({
      preferred_categories,
      preferred_tags
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};