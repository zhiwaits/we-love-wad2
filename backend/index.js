
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

const eventsRoutes = require('./routes/events');
const profilesRoutes = require('./routes/profiles');
const rsvpsRoutes = require('./routes/rsvps');
const eventTagsRoutes = require('./routes/eventTags');
const followsRoutes = require('./routes/follows');

app.use(cors());
app.use(bodyParser.json());




app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
