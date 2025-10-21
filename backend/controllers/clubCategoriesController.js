const pool = require('../db');
const table = "club_categories"


exports.getAllClubCategories = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getClubCategoryById = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Club Category not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getClubCategoryByName = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE name = $1`, [req.params.name]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event Tag not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createClubCategory = async (req, res) => {
    try {
        const {
            name
        } = req.body;
        const result = await pool.query(
            `INSERT INTO ${table} (name)
       VALUES ($1) RETURNING *`,
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteClubCategory = async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Event Tag not found' });
        res.json({ message: 'Club Category deleted', event_tag: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};