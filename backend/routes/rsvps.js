const express = require('express');
const router = express.Router();
const rsvpsController = require('../controllers/rsvpsController');

router.get('/', rsvpsController.getAllRsvps);
router.get('/event/:id', rsvpsController.getRsvpsByEventId);
router.get('/user/:id', rsvpsController.getRsvpsByUserId);
router.post('/', rsvpsController.createRsvp);
router.put('/:id', rsvpsController.updateRsvp);
router.delete('/:id', rsvpsController.deleteRsvp);

module.exports = router;