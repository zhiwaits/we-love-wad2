const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventTagsController');

router.get('/', eventsController.getAllEventTags);
router.get('/event/:id', eventsController.getEventTagsByEventId);
router.get('/tag/:tag', eventsController.getEventsByEventTag);
router.post('/', eventsController.createEventTag);
router.delete('/:event_id/:tag_id', eventsController.deleteEventTag);

module.exports = router;