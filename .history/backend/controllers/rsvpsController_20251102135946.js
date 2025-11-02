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
             WHERE r.event_id = $1 AND r.status = 'confirmed'
             ORDER BY r.created_at DESC`,
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

        // Expire any pending RSVPs that have been idle for more than 24 hours
        await pool.query(`
            DELETE FROM ${table}
            WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
        `);

        // Check if event has capacity and if user hasn't already RSVP'd
        const eventCheck = await pool.query(`
            SELECT e.id, e.capacity, e.attendees,
                   COUNT(r.id) as confirmed_rsvps
            FROM events e
            LEFT JOIN rsvps r ON e.id = r.event_id AND r.status = 'confirmed'
            WHERE e.id = $1
            GROUP BY e.id, e.capacity, e.attendees
        `, [event_id]);

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventCheck.rows[0];
        
        // Check if user already has an RSVP
        const existingRsvp = await pool.query(`
            SELECT id, status FROM rsvps WHERE event_id = $1 AND user_id = $2
        `, [event_id, user_id]);
        
        if (existingRsvp.rows.length > 0) {
            const rsvp = existingRsvp.rows[0];
            if (rsvp.status === 'confirmed') {
                return res.status(400).json({ error: 'You have already confirmed your RSVP for this event' });
            } else if (rsvp.status === 'pending') {
                return res.status(400).json({ error: 'You already have a pending RSVP for this event. Please check your email to confirm.' });
            }
        }

        // Check capacity
        const currentConfirmed = parseInt(event.confirmed_rsvps) || 0;
        const maxAttendees = event.capacity != null ? parseInt(event.capacity, 10) : null;
        
        if (maxAttendees && currentConfirmed >= maxAttendees) {
            return res.status(400).json({ error: 'This event is at full capacity' });
        }

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
            const eventData = eventResult.rows[0];
            const confirmationLink = `http://localhost:5173/confirm-rsvp/${confirmation_token}`;

            await sendRsvpConfirmationEmail(user.email, user.name, eventData.title, confirmationLink);
        }

        res.status(201).json({
            message: 'Confirmation email sent! Please confirm within 24 hours.',
            rsvp: result.rows[0]
        });

    } catch (err) {
        console.error('Error creating RSVP:', err);
        res.status(500).json({
            error: err.message,
            detail: err.detail
        });
    }
};

exports.confirmRsvp = async (req, res) => {
    const client = await pool.connect();
    try {
        const { token } = req.params;

        await client.query('BEGIN');

        const rsvpResult = await client.query(
            `SELECT id, event_id, user_id, created_at
             FROM ${table}
             WHERE confirmation_token = $1 AND status = 'pending'
             FOR UPDATE`,
            [token]
        );

        if (rsvpResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invalid or expired confirmation token.' });
        }

        const rsvp = rsvpResult.rows[0];
        const createdAt = new Date(rsvp.created_at);
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        if (Number.isFinite(createdAt.getTime()) && Date.now() - createdAt.getTime() > twentyFourHoursMs) {
            await client.query(`DELETE FROM ${table} WHERE id = $1`, [rsvp.id]);
            await client.query('COMMIT');
            return res.status(410).json({ error: 'Your RSVP confirmation period has expired. Please join the event again.' });
        }

        const eventUpdate = await client.query(
            `UPDATE events
             SET attendees = attendees + 1
             WHERE id = $1 AND (capacity IS NULL OR attendees < capacity)
             RETURNING id`,
            [rsvp.event_id]
        );

        if (eventUpdate.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'This event is already at full capacity.' });
        }

        const confirmResult = await client.query(
            `UPDATE ${table}
             SET status = 'confirmed', confirmation_token = NULL
             WHERE id = $1
             RETURNING *`,
            [rsvp.id]
        );

        await client.query('COMMIT');

        res.json({ message: 'RSVP confirmed successfully!', rsvp: confirmResult.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error confirming RSVP:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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
        // First, check if the RSVP exists and get its status
        const rsvpCheck = await pool.query(
            `SELECT status, event_id FROM ${table} WHERE event_id = $1 AND user_id = $2`,
            [req.params.event_id, req.params.user_id]
        );

        if (rsvpCheck.rows.length === 0) {
            return res.status(404).json({ error: 'RSVP not found' });
        }

        const rsvp = rsvpCheck.rows[0];
        const eventId = rsvp.event_id;

        // Delete the RSVP
        const result = await pool.query(
            `DELETE FROM ${table} WHERE event_id = $1 AND user_id = $2 RETURNING *`,
            [req.params.event_id, req.params.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'RSVP not found' });
        }

        // If the RSVP was confirmed, decrement the attendee count
        if (rsvp.status === 'confirmed') {
            await pool.query(
                `UPDATE events SET attendees = GREATEST(attendees - 1, 0) WHERE id = $1`,
                [eventId]
            );
        }

        res.json({ message: 'RSVP deleted', rsvp: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};