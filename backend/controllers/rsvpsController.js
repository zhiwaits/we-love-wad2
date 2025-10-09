const pool = require('../db');
const table = "rsvps";

exports.getAllRsvps = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getRsvpsByEventId = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE event_id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRsvpsByUserId = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.createRsvp = async (req, res) => {
    try {
        const {
           event_id, user_id, status
        } = req.body;
        const result = await pool.query(
            `INSERT INTO ${table} (event_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING *`,
            [event_id, user_id, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.updateRsvp = async (req, res) => {
    const { id } = req.params;
    const {
        status
    } = req.body;
    try {
        const result = await pool.query(
            `UPDATE ${table} SET status=$1 WHERE id=$2 RETURNING *`,
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.deleteRsvp = async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json({ message: 'Rsvp deleted', rsvp: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};