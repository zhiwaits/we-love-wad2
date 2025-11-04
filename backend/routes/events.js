const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

router.get('/', eventsController.getAllEvents);
router.get('/recommended/:userId', eventsController.getRecommendedEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', eventsController.createEvent);
router.put('/:id', eventsController.updateEvent);
router.delete('/:id', eventsController.deleteEvent);

module.exports = router;