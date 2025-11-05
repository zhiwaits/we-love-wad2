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
    const rawSort = typeof req.query.sort === 'string' ? req.query.sort.toLowerCase() : 'newest';
    const allowedSorts = new Set(['newest', 'most-followers', 'most_followers', 'mostfollowers', 'most-events', 'most_events', 'mostevents', 'random']);
    const sortKey = allowedSorts.has(rawSort) ? rawSort : 'newest';

    let orderClause = 'ORDER BY p.created_at DESC, p.id DESC';
    if (sortKey === 'random') {
      orderClause = 'ORDER BY RANDOM()';
    } else if (sortKey === 'most-followers' || sortKey === 'most_followers' || sortKey === 'mostfollowers') {
      orderClause = 'ORDER BY follower_count DESC, p.created_at DESC, p.id DESC';
    } else if (sortKey === 'most-events' || sortKey === 'most_events' || sortKey === 'mostevents') {
      orderClause = 'ORDER BY event_count DESC, p.created_at DESC, p.id DESC';
    }

    const query = `
      WITH follower_counts AS (
        SELECT followed_club_id AS club_id, COUNT(*)::int AS follower_count
        FROM user_follows
        GROUP BY followed_club_id
      ),
      event_counts AS (
        SELECT owner_id AS club_id, COUNT(*)::int AS event_count
        FROM events
        GROUP BY owner_id
      )
      SELECT
        p.*, 
        COALESCE(follower_counts.follower_count, 0) AS follower_count,
        COALESCE(event_counts.event_count, 0) AS event_count
      FROM ${table} p
      LEFT JOIN follower_counts ON follower_counts.club_id = p.id
      LEFT JOIN event_counts ON event_counts.club_id = p.id
      WHERE p.account_type = 'club'
      ${orderClause}
    `;

    const result = await pool.query(query);
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
    const {
      name,
      username,
      email,
      password,
      category_preferences = [],
      club_category_preferences = [],
      tag_preferences = [],
      // Also accept alternate naming for compatibility
      preferred_categories,
      preferred_tags
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email, and password are required' });
    }

    // Use category_preferences if provided, otherwise use preferred_categories
    const categoryPrefs = category_preferences.length > 0 ? category_preferences : (preferred_categories || []);
    const tagPrefs = tag_preferences.length > 0 ? tag_preferences : (preferred_tags || []);
    const clubCategoryPrefs = club_category_preferences;

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
    if (Array.isArray(categoryPrefs) && categoryPrefs.length > 0) {
      for (const category of categoryPrefs) {
        await client.query(
          'INSERT INTO category_preference (userid, category) VALUES ($1, $2)',
          [userId, category]
        );
      }
    }

    // Insert club category preferences if provided
    if (Array.isArray(clubCategoryPrefs) && clubCategoryPrefs.length > 0) {
      for (const clubCategory of clubCategoryPrefs) {
        const numericCategory = Number(clubCategory);
        if (!Number.isFinite(numericCategory)) continue;
        await client.query(
          'INSERT INTO club_category_preference (userid, club_category) VALUES ($1, $2)',
          [userId, numericCategory]
        );
      }
    }

    // Insert tag preferences if provided
    if (Array.isArray(tagPrefs) && tagPrefs.length > 0) {
      for (const tagPref of tagPrefs) {
        const numericTagId = Number(tagPref);
        if (Number.isFinite(numericTagId)) {
          await client.query(
            'INSERT INTO tag_preference (userid, tagid) VALUES ($1, $2)',
            [userId, numericTagId]
          );
          continue;
        }

        if (typeof tagPref !== 'string' || !tagPref.trim()) continue;

        const tagResult = await client.query(
          'SELECT id FROM event_tags WHERE LOWER(tag_name) = LOWER($1)',
          [tagPref.trim()]
        );

        let tagId;
        if (tagResult.rows.length > 0) {
          tagId = tagResult.rows[0].id;
        } else {
          // Create new tag if it doesn't exist
          const newTag = await client.query(
            'INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING id',
            [tagPref.trim().toLowerCase()]
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
    name, username, email, password
  } = req.body;
  try {
    // Handle password - only hash if provided
    let passwordValue = password;
    if (password) {
      passwordValue = crypto.createHash('sha256').update(String(password)).digest('hex');
    }

    // Build dynamic query based on whether password is being updated
    let query, params;
    if (passwordValue) {
      query = `UPDATE ${table} SET name=$1, username=$2, email=$3, password=$4 WHERE id=$5 AND account_type='user' RETURNING *`;
      params = [name, username, email, passwordValue, id];
    } else {
      query = `UPDATE ${table} SET name=$1, username=$2, email=$3 WHERE id=$4 AND account_type='user' RETURNING *`;
      params = [name, username, email, id];
    }

    const result = await pool.query(query, params);
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

    // Get club categories from club_category_preference table
    const clubCategoriesResult = await pool.query(
      `SELECT club_category FROM club_category_preference WHERE userid = $1`,
      [id]
    );

    // Get tags from tag_preference table (need to join with event_tags to get tag names)
    const tagsResult = await pool.query(
      `SELECT et.id, et.tag_name
       FROM tag_preference tp
       JOIN event_tags et ON tp.tagid = et.id
       WHERE tp.userid = $1`,
      [id]
    );

    const preferences = {
      categoryPreferences: categoriesResult.rows.map(row => row.category),
  clubCategoryPreferences: clubCategoriesResult.rows.map(row => Number(row.club_category)),
      tagPreferences: tagsResult.rows.map(row => Number(row.id))
    };

    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateUserPreferences = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { categoryPreferences, clubCategoryPreferences, tagPreferences } = req.body;

    // Validate that arrays are provided
    if (!Array.isArray(categoryPreferences) || !Array.isArray(clubCategoryPreferences) || !Array.isArray(tagPreferences)) {
      return res.status(400).json({ error: 'categoryPreferences, clubCategoryPreferences, and tagPreferences must be arrays' });
    }

    // Validate minimum and maximum limits (3-10 total preferences)
    const totalPreferences = categoryPreferences.length + clubCategoryPreferences.length + tagPreferences.length;
    if (totalPreferences < 3) {
      return res.status(400).json({ error: 'Please select at least 3 preferences (categories, club categories, or tags combined)' });
    }
    if (totalPreferences > 10) {
      return res.status(400).json({ error: 'Please select no more than 10 preferences (categories, club categories, or tags combined)' });
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
    await client.query('DELETE FROM club_category_preference WHERE userid = $1', [id]);
    await client.query('DELETE FROM tag_preference WHERE userid = $1', [id]);

    // Insert new category preferences
    for (const category of categoryPreferences) {
      await client.query(
        'INSERT INTO category_preference (userid, category) VALUES ($1, $2)',
        [id, category]
      );
    }

    // Insert new club category preferences
    for (const clubCategory of clubCategoryPreferences) {
      const numericCategory = Number(clubCategory);
      if (!Number.isFinite(numericCategory)) continue;
      await client.query(
        'INSERT INTO club_category_preference (userid, club_category) VALUES ($1, $2)',
        [id, numericCategory]
      );
    }

    // Insert new tag preferences
    for (const tagPref of tagPreferences) {
      const numericTagId = Number(tagPref);
      if (Number.isFinite(numericTagId)) {
        await client.query(
          'INSERT INTO tag_preference (userid, tagid) VALUES ($1, $2)',
          [id, numericTagId]
        );
        continue;
      }

      if (typeof tagPref !== 'string' || !tagPref.trim()) continue;

      const tagResult = await client.query(
        'SELECT id FROM event_tags WHERE LOWER(tag_name) = LOWER($1)',
        [tagPref.trim()]
      );

      let tagId;
      if (tagResult.rows.length > 0) {
        tagId = tagResult.rows[0].id;
      } else {
        const newTag = await client.query(
          'INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING id',
          [tagPref.trim().toLowerCase()]
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
      categoryPreferences,
      clubCategoryPreferences,
      tagPreferences
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};