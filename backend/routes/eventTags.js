const express = require('express');
const router = express.Router();
const eventTagsController = require('../controllers/eventTagsController');

router.get('/', eventTagsController.getAllEventTags);
router.get('/event/:id', eventTagsController.getEventTagsByEventId);
router.get('/tag/:tag', eventTagsController.getEventsByEventTag);
router.post('/', eventTagsController.createEventTag);
router.delete('/:event_id/:tag_id', eventTagsController.deleteEventTag);

module.exports = router;