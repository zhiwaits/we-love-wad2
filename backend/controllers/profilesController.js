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


exports.getProfileById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createProfile = async (req, res) => {
  try {
    const {
      username, email, password, account_type
    } = req.body;
    const result = await pool.query(
      `INSERT INTO ${table} (username, email, password, account_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [username, email, password, account_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  const { id } = req.params;
  const {
    username, email, password, account_type
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ${table} SET username=$1, email=$2, password=$3, account_type=$4 WHERE id=$5 RETURNING *`,
      [username, email, password, account_type, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
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