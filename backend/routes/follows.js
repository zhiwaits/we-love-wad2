const express = require('express');
const router = express.Router();
const followsController = require('../controllers/followsController');

router.get('/', followsController.getAllFollows);
router.get('/user/:id', followsController.getFollowsByUserId);
router.get('/club/:id', followsController.getFollowersByClubId);
router.post('/', followsController.createFollow);
router.delete('/:follower_id/:followed_club_id', followsController.deleteFollow);

module.exports = router;