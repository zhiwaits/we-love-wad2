const pool = require('../db');
const table = "rsvps";

exports.getAllRsvps = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $1', [table]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getRsvpsByEventId = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $2 WHERE event_id = $1', [req.params.id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRsvpsByUserId = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $2 WHERE user_id = $1', [req.params.id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
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
            `INSERT INTO $1 (event_id, user_id, status)
       VALUES ($2, $3, $4) RETURNING *`,
            [table, event_id, user_id, status]
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
            `UPDATE $1 SET status=$3 WHERE id=$2 RETURNING *`,
            [table, id, status]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.deleteRsvp = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM $2 WHERE id = $1 RETURNING *', [req.params.id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted', event: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};