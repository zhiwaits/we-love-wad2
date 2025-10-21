const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres.okkqvwmdmnwadkokzynz',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'group7loveswad2',
    port: 5432,
    // Connection pool settings for Supabase
    max: 10, // Maximum number of clients in the pool
    min: 2, // Minimum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    acquireTimeoutMillis: 60000, // Return an error after 60 seconds if a client could not be acquired
    allowExitOnIdle: true, // Allow the pool to close when all clients are idle
    ssl: {
        rejectUnauthorized: false // Required for Supabase connection
    }
});

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Handle pool connection events
pool.on('connect', (client) => {
    console.log('New client connected to the database');
});

pool.on('remove', (client) => {
    console.log('Client removed from pool');
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err.message);
        console.error('Connection details:', {
            host: 'aws-1-ap-southeast-1.pooler.supabase.com',
            database: 'postgres',
            user: 'postgres.okkqvwmdmnwadkokzynz',
            port: 5432
        });
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT, closing pool...');
    pool.end(() => {
        console.log('Pool closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, closing pool...');
    pool.end(() => {
        console.log('Pool closed');
        process.exit(0);
    });
});

module.exports = pool;