const express = require('express');
const router = express.Router();
const savedEventsController = require('../controllers/savedEventsController');

router.get('/', savedEventsController.getAllSaved);
router.get('/user/:id', savedEventsController.getSavedByUserId);
router.get('/event/:id', savedEventsController.getSavedByEventId);
router.post('/', savedEventsController.createSaved);
router.delete('/:follower_id/:followed_club_id', savedEventsController.deleteSaved);

module.exports = router;