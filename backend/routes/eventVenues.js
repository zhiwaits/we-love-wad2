const express = require('express');
const router = express.Router();
const eventVenuesController = require('../controllers/eventVenuesController');

router.get('/', eventVenuesController.getAllEventVenues);
router.get('/:name', eventVenuesController.getEventVenueByName);
router.post('/', eventVenuesController.createEventVenue);
router.delete('/:name', eventVenuesController.deleteEventVenue);

module.exports = router;