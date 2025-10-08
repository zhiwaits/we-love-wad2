const pool = require('../db');
const table = "events";

exports.getAllEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $1', [table]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getEventById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $2 WHERE id = $1', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createEvent = async (req, res) => {
  try {
    const {
      title, description, datetime, location, category, capacity, image_url, owner_id
    } = req.body;
    const result = await pool.query(
      `INSERT INTO $9 (title, description, datetime, location, category, capacity, image_url, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, datetime, location, category, capacity, image_url, owner_id, table]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, datetime, location, category, capacity, image_url, owner_id
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE $10 SET title=$1, description=$2, datetime=$3, location=$4,
       category=$5, capacity=$6, image_url=$7, owner_id=$8 WHERE id=$9 RETURNING *`,
      [title, description, datetime, location, category, capacity, image_url, owner_id, id, table]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteEvent = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM $2 WHERE id = $1 RETURNING *', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};