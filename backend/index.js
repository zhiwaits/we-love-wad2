
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

// Configure CORS explicitly
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://127.0.0.1:5173',
    "https://wad2groupproject.vercel.app/", // Matches any wad2groupproject variation
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '25mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Disable caching for event images to ensure updates are visible immediately
    if (path.includes('/uploads/event/')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));
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
app.use('/eventVenues', eventVenues)




app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
