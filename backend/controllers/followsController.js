const pool = require('../db');
const table = "user_follows";

exports.getAllFollows = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table}`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getFollowsByUserId = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE follower_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Follow not found' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFollowersByClubId = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE followed_club_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Followers not found' });
    res.json(result.rows);
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
      `INSERT INTO ${table} (follower_id, followed_club_id)
       VALUES ($1, $2) RETURNING *`,
      [follower_id, followed_club_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteFollow = async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE follower_id = $1 AND followed_club_id = $2 RETURNING *`, [req.params.follower_id, req.params.followed_club_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Follow not found' });
        res.json({ message: 'Follow deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};