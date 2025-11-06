require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

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

const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://testwad2-a91n.vercel.app',
  'https://testwad2-a91n-g02b5xnav-jin-raes-projects.vercel.app'
];

const DYNAMIC_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/testwad2-a91n(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/testwad2-tglu(?:-[a-z0-9-]+)?\.vercel\.app$/i
];

const ALLOWED_HEADERS = ['Origin', 'Content-Type', 'Authorization', 'token', 'X-Requested-With', 'Accept'];

const corsOptionsDelegate = (req, callback) => {
  const requestOrigin = req.header('Origin');

  if (!requestOrigin) {
    return callback(null, {
      origin: false,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ALLOWED_HEADERS,
      optionsSuccessStatus: 204,
    });
  }

  const isStaticAllowed = STATIC_ALLOWED_ORIGINS.includes(requestOrigin);
  const isDynamicAllowed = DYNAMIC_ALLOWED_ORIGINS.includes(requestOrigin);
  const isPatternAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(requestOrigin));
  const isAllowed = isStaticAllowed || isDynamicAllowed || isPatternAllowed;

  callback(null, {
    origin: isAllowed ? requestOrigin : false,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ALLOWED_HEADERS,
    optionsSuccessStatus: 204,
  });
};

app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
  });
}

module.exports = app;
