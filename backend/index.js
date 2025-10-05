
const express = require('express');
const app = express();
const port = 3000;

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.okkqvwmdmnwadkokzynz',
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  database: 'SMU Events Hub',
  password: 'group7loveswad2',
  port: 5432, 
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
