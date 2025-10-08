const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/followsController');

router.get('/', eventsController.getAllFollows);
router.get('/:id', eventsController.getFollowsByUserId);
router.get('/:id', eventsController.getFollowersByClubId);
router.post('/', eventsController.createFollow);
router.delete('/:id', eventsController.deleteFollow);

module.exports = router;