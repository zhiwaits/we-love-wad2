const pool = require('../db');
const table = "event_saved";

exports.getAllSaved = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getSavedByUserId = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSavedByEventId = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE event_id = $1`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.createSaved = async (req, res) => {
    try {
        const {
           event_id, user_id
        } = req.body;
        const result = await pool.query(
            `INSERT INTO ${table} (event_id, user_id)
       VALUES ($1, $2) RETURNING *`,
            [event_id, user_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSaved = async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE event_id = $1 AND user_id = $2 RETURNING *`, [req.params.event_id, req.params.user_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Saved event not found' });
        res.json({ message: 'Saved event deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};