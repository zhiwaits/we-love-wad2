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


// In rsvpsController.js - Update createRsvp method

exports.createRsvp = async (req, res) => {
    try {
        const {
            event_id, user_id, status, rsvp_date
        } = req.body;

        console.log('Creating RSVP:', { event_id, user_id, status, rsvp_date });

        // Check if RSVP already exists
        const existingRsvp = await pool.query(
            `SELECT * FROM ${table} WHERE event_id = $1 AND user_id = $2`,
            [event_id, user_id]
        );

        if (existingRsvp.rows.length > 0) {
            return res.status(409).json({ 
                error: 'You have already RSVP\'d to this event',
                rsvp: existingRsvp.rows[0]
            });
        }

        // Verify user exists in profiles table
        const userCheck = await pool.query(
            'SELECT id FROM profiles WHERE id = $1',
            [user_id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(400).json({ 
                error: `User with id ${user_id} does not exist in profiles table` 
            });
        }

        // Verify event exists
        const eventCheck = await pool.query(
            'SELECT id FROM events WHERE id = $1',
            [event_id]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(400).json({ 
                error: `Event with id ${event_id} does not exist` 
            });
        }

        // Create RSVP
        const result = await pool.query(
            `INSERT INTO ${table} (event_id, user_id, status, rsvp_date, created_at)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [event_id, user_id, status || 'confirmed', rsvp_date || new Date().toISOString().split('T')[0]]
        );

        console.log('RSVP created successfully:', result.rows[0]);
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error('Error creating RSVP:', err);
        res.status(500).json({ 
            error: err.message,
            detail: err.detail // PostgreSQL error details
        });
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
        const result = await pool.query(`DELETE FROM ${table} WHERE event_id = $1 AND user_id = $2 RETURNING *`, [req.params.event_id, req.params.user_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json({ message: 'Rsvp deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};