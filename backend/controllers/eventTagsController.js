const pool = require('../db');
const table = "event_tag_map"


exports.getAllEventTags = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $1', [table]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getEventTagsByEventId = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $2 WHERE event_id = $1', [req.params.id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getEventsByEventTag = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM $2 WHERE tag_id = $1', [req.params.id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createEventTag = async (req, res) => {
    try {
        const {
            event_id, tag_id
        } = req.body;
        const result = await pool.query(
            `INSERT INTO $3 (event_id, tag_id)
       VALUES ($1, $2) RETURNING *`,
            [event_id, tag_id, table]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteEventTag = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM $3 WHERE event_id = $1 AND tag_id = $2 RETURNING *', [req.params.event_id, req.params.tag_id, table]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted', event: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};