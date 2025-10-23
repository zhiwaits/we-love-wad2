const express = require('express');
const router = express.Router();
const rsvpsController = require('../controllers/rsvpsController');

router.get('/', rsvpsController.getAllRsvps);
router.get('/event/:id', rsvpsController.getRsvpsByEventId);
router.get('/user/:id', rsvpsController.getRsvpsByUserId);
router.get('/owner/:id', rsvpsController.getRsvpsForEventsByOwner);
router.post('/', rsvpsController.createRsvp);
router.put('/:id', rsvpsController.updateRsvp);
router.delete('/:event_id/:user_id', rsvpsController.deleteRsvp);

module.exports = router;