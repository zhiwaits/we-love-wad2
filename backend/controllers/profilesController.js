const pool = require('../db');
const table = "profiles";

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
    const {
      username, email, password
    } = req.body;
    const result = await pool.query(
      `INSERT INTO ${table} (username, email, password, account_type)
       VALUES ($1, $2, $3, 'user') RETURNING *`,
      [username, email, password]
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
    username, email, password, club_description, club_category, club_image
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ${table} SET username=$1, email=$2, password=$3, club_description=$4, club_category=$5, club_image=$6 WHERE id=$7 AND account_type='club' RETURNING *`,
      [username, email, password, club_description, club_category, club_image, id]
    );
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