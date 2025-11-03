require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const pool = new Pool({
        user: process.env.SUPABASE_USER,
        host: process.env.SUPABASE_HOST,
        database: process.env.SUPABASE_DB,
        password: process.env.SUPABASE_PASS,
        port: process.env.SUPABASE_PORT,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        console.log('Testing database connection...');
        const res = await pool.query('SELECT NOW()');
        console.log('Database connected successfully:', res.rows[0]);
    } catch (err) {
        console.error('Database connection error:', err.message);
        console.error('Error code:', err.code);
        console.error('Error details:', err);
    } finally {
        await pool.end();
    }
}

testConnection();