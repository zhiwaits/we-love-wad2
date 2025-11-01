
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

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'upload')));
app.use('/events', eventsRoutes);
app.use('/profiles', profilesRoutes);
app.use('/rsvps', rsvpsRoutes);
app.use('/eventTags', eventTagsRoutes);
app.use('/follows', followsRoutes);
app.use('/tags', tagsRoutes);
app.use('/stats', statsRoutes);
app.use('/savedEvents', savedRoutes);
app.use('/clubCategories', clubCategories);




app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
