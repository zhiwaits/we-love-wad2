const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/user/:id', statsController.getUserStats);

module.exports = router;
