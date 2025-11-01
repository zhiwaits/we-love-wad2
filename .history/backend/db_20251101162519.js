const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.SUPABASE_USER || 'postgres.okkqvwmdmnwadkokzynz',
    host: process.env.SUPABASE_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: process.env.SUPABASE_DB || 'postgres',
    password: process.env.SUPABASE_PASS || 'group7loveswad2',
    port: process.env.SUPABASE_PORT || 5432,
    ssl: { rejectUnauthorized: false },  // Enable SSL (required for Supabase)
    keepAlive: true,  // Prevent idle disconnections
    keepAliveInitialDelayMillis: 0,
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 60000,  // Timeout after 60s
    max: 10,  // Limit pool size
    timezone: 'Asia/Singapore'
});

// Add error handling to prevent crashes
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Optionally reconnect or log
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error', err);
    } else {
        console.log('Database connected at:', res.rows[0].now);
    }
});

module.exports = pool;