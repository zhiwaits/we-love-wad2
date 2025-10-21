const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/user/:id', statsController.getUserStats);
router.get('/club/:id', statsController.getClubStats);

module.exports = router;
