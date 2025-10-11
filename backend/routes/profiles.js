const express = require('express');
const router = express.Router();
const profilesController = require('../controllers/profilesController');

router.get('/', profilesController.getAllProfiles);
router.get('/:id', profilesController.getProfileById);
router.post('/', profilesController.createProfile);
router.put('/:id', profilesController.updateProfile);
router.delete('/:id', profilesController.deleteProfile);

module.exports = router;