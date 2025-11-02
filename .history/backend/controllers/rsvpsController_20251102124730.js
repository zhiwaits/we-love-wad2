const pool = require('../db');
const crypto = require('crypto');
const { sendRsvpConfirmationEmail } = require('../notification/notification');
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
        const result = await pool.query(
            `SELECT r.*, p.name AS attendee_name, p.email AS attendee_email
             FROM ${table} r
             LEFT JOIN profiles p ON r.user_id = p.id
             WHERE r.event_id = $1
             ORDER BY r.created_at ASC`,
            [req.params.id]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRsvpsByUserId = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRsvpsForEventsByOwner = async (req, res) => {
    try {
        const ownerId = req.params.id;
        // Get all RSVPs for events owned by this user
        const result = await pool.query(`
            SELECT r.* FROM ${table} r
            INNER JOIN events e ON r.event_id = e.id
            WHERE e.owner_id = $1
        `, [ownerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// In rsvpsController.js - Update createRsvp method

exports.createRsvp = async (req, res) => {
    try {
        const {
            event_id, user_id, rsvp_date
        } = req.body;

        const confirmation_token = crypto.randomBytes(32).toString('hex');

        const result = await pool.query(
            `INSERT INTO ${table} (event_id, user_id, status, rsvp_date, confirmation_token, created_at)
             VALUES ($1, $2, 'pending', $3, $4, NOW()) RETURNING *`,
            [event_id, user_id, rsvp_date || new Date().toISOString().split('T')[0], confirmation_token]
        );

        const userResult = await pool.query('SELECT email, name FROM profiles WHERE id = $1', [user_id]);
        const eventResult = await pool.query('SELECT title FROM events WHERE id = $1', [event_id]);

        if (userResult.rows.length > 0 && eventResult.rows.length > 0) {
            const user = userResult.rows[0];
            const event = eventResult.rows[0];
            const confirmationLink = `http://localhost:5173/confirm-rsvp/${confirmation_token}`;

            await sendRsvpConfirmationEmail(user.email, user.name, event.title, confirmationLink);
        }

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error('Error creating RSVP:', err);
        res.status(500).json({
            error: err.message,
            detail: err.detail
        });
    }
};

exports.confirmRsvp = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await pool.query(
            `UPDATE ${table} SET status = 'confirmed', confirmation_token = NULL 
             WHERE confirmation_token = $1 AND status = 'pending' RETURNING *`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired confirmation token.' });
        }

        res.json({ message: 'RSVP confirmed successfully!', rsvp: result.rows[0] });

    } catch (err) {
        console.error('Error confirming RSVP:', err);
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
        const result = await pool.query(`DELETE FROM ${table} WHERE event_id = $1 AND user_id = $2 RETURNING *`, [req.params.event_id, req.params.user_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rsvp not found' });
        res.json({ message: 'Rsvp deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};