const pool = require('../db');
const table = "profiles";

exports.getAllProfiles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $1', [table]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getProfileById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $2 WHERE id = $1', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
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
      `INSERT INTO $1 (username, email, password, account_type)
       VALUES ($2, $3, $4, $5) RETURNING *`,
      [table, username, email, password, account_type]
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
      `UPDATE $1 SET username=$2, email=$3, password=$4, account_type=$5 WHERE id=$6 RETURNING *`,
      [table, username, email, password, account_type, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteProfile = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM $2 WHERE id = $1 RETURNING *', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};