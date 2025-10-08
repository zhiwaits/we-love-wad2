const pool = require('../db');
const table = "user_follows";

exports.getAllFollows = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $1', [table]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getFollowsByUserId = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $2 WHERE follower_id = $1', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFollowersByClubId = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM $2 WHERE followed_club_id = $1', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createFollow = async (req, res) => {
  try {
    const {
      follower_id, followed_club_id
    } = req.body;
    const result = await pool.query(
      `INSERT INTO $1 (follower_id, followed_club_id)
       VALUES (follower_id, followed_club_id) RETURNING *`,
      [table, follower_id, followed_club_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteFollow = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM $2 WHERE id = $1 RETURNING *', [req.params.id, table]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};