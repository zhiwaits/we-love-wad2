const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres.okkqvwmdmnwadkokzynz',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'group7loveswad2',
    port: 5432,
    //ssl: true, // Explicitly enable SSL
    ssl: { rejectUnauthorized: false }// for testing purpose only, disable in production

});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error', err);
    } else {
        console.log('Database connected at:', res.rows[0].now);
    }
});

module.exports = pool;