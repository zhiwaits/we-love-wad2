const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/profilesController');

router.get('/', eventsController.getAllProfiles);
router.get('/:id', eventsController.getProfileById);
router.post('/', eventsController.createProfile);
router.put('/:id', eventsController.updateProfile);
router.delete('/:id', eventsController.deleteProfile);

module.exports = router;