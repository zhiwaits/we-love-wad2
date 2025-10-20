const express = require('express');
const router = express.Router();
const travelTimeController = require('../controllers/travelTimeController');

// POST /api/travel-time
router.post('/travel-time', travelTimeController.getTravelTime);

module.exports = router;
