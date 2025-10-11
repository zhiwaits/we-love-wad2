const pool = require('../db');
const table = "event_tags"


exports.getAllTags = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getTagById = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event Tag not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTagByName = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE tag_name = $1`, [req.params.name]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event Tag not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createTag = async (req, res) => {
    try {
        const {
            tag_name
        } = req.body;
        const result = await pool.query(
            `INSERT INTO ${table} (tag_name)
       VALUES ($1) RETURNING *`,
            [tag_name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTag = async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event Tag not found' });
        res.json({ message: 'Event Tag deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};