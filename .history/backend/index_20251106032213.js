require('dotenv').config();
const express = require('express');
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

const STATIC_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://testwad2-tglu.vercel.app',
  'https://testwad2-tglu-gwjbn2gka-jin-raes-projects.vercel.app',
  'https://testwad2-a91n.vercel.app',
  'https://testwad2-a91n-g02b5xnav-jin-raes-projects.vercel.app'
]);

const DYNAMIC_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/testwad2-a91n(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/testwad2-tglu(?:-[a-z0-9-]+)?\.vercel\.app$/i
];

const ALLOWED_HEADERS = ['Origin', 'Content-Type', 'Authorization', 'token', 'X-Requested-With', 'Accept'];
const ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (DYNAMIC_ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin);
  const requestedHeaders = req.headers['access-control-request-headers'];

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', requestedHeaders || ALLOWED_HEADERS.join(', '));
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method.toUpperCase() === 'OPTIONS') {
    return allowed ? res.status(204).end() : res.status(403).end();
  }

  return next();
});
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
