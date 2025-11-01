const express = require('express');
const router = express.Router();
const savedEventsController = require('../controllers/savedEventsController');

router.get('/', savedEventsController.getAllSaved);
router.get('/user/:id', savedEventsController.getSavedByUserId);
router.get('/event/:id', savedEventsController.getSavedByEventId);
router.post('/', savedEventsController.createSaved);
router.delete('/:event_id/:user_id', savedEventsController.deleteSaved);

module.exports = router;