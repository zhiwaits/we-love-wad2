const { Pool } = require('pg');
require('dotenv').config();

let pool;

function createPool() {
    pool = new Pool({
        user: process.env.SUPABASE_USER || 'postgres.okkqvwmdmnwadkokzynz',
        host: process.env.SUPABASE_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
        database: process.env.SUPABASE_DB || 'postgres',
        password: process.env.SUPABASE_PASS || 'group7loveswad2',
        port: process.env.SUPABASE_PORT || 5432,
        ssl: { rejectUnauthorized: false },  
        keepAlive: true, 
        keepAliveInitialDelayMillis: 0,
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 60000, 
        max: 10, 
        timezone: 'Asia/Singapore'
    });


    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client:', err.message);
        if (err.code === 'XX000' || err.message.includes('db_termination') || err.message.includes('shutdown')) {
            console.log('Database connection terminated. Attempting to reconnect in 5 seconds...');
            pool.end(); ol
            setTimeout(createPool, 5000); 
        }
    });

    // Test connection on pool creation
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('Database connection error:', err.message);
        } else {
            console.log('Database connected at:', res.rows[0].now);
        }
    });

    return pool;
}

// Initialize the pool
pool = createPool();

module.exports = pool;