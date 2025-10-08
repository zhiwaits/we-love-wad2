const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/rsvpsController');

router.get('/', eventsController.getAllRsvps);
router.get('/:id', eventsController.getRsvpsByEventId);
router.get('/:id', eventsController.getRsvpsByUserId);
router.post('/', eventsController.createRsvp);
router.put('/:id', eventsController.updateRsvp);
router.delete('/:id', eventsController.deleteRsvp);

module.exports = router;