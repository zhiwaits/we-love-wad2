
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const port = 3000;

const eventsRoutes = require('./routes/events');
const profilesRoutes = require('./routes/profiles');
const rsvpsRoutes = require('./routes/rsvps');
const eventTagsRoutes = require('./routes/eventTags');
const followsRoutes = require('./routes/follows');
const tagsRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');
const savedRoutes = require('./routes/savedEvents');
const clubCategories = require('./routes/clubCategories');
const authRoutes = require('./routes/auth');
const eventCategories = require('./routes/eventCategories');
const eventVenues = require('./routes/eventVenues');

app.use(cors());
app.use(bodyParser.json({ limit: '25mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/events', eventsRoutes);
app.use('/profiles', profilesRoutes);
app.use('/rsvps', rsvpsRoutes);
app.use('/eventTags', eventTagsRoutes);
app.use('/follows', followsRoutes);
app.use('/tags', tagsRoutes);
app.use('/stats', statsRoutes);
app.use('/savedEvents', savedRoutes);
app.use('/clubCategories', clubCategories);
app.use('/', authRoutes);
app.use('/eventCategories', eventCategories);
const pool = require('./db');

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: result.rows[0].now,
            uptime: process.uptime()
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message
        });
    }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'XX000' || err.message.includes('db_termination')) {
        return res.status(503).json({
            error: 'Database connection error',
            message: 'Unable to connect to database. Please try again later.',
            code: 'DB_CONNECTION_ERROR'
        });
    }

    // Handle PostgreSQL errors
    if (err.code && err.severity) {
        return res.status(500).json({
            error: 'Database error',
            message: 'A database error occurred',
            code: err.code
        });
    }

    // Generic error handler
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
