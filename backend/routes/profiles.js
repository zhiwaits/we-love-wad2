const express = require('express');
const router = express.Router();
const profilesController = require('../controllers/profilesController');

router.get('/club/:id/stats', profilesController.getClubStats);
router.get('/', profilesController.getAllProfiles);
router.get('/user', profilesController.getAllUserProfiles);
router.get('/club', profilesController.getAllClubProfiles);
router.get('/availability', profilesController.checkAvailability);
router.get('/:id/preferences', profilesController.getUserPreferences);
router.get('/:id', profilesController.getProfileById);
router.post('/user', profilesController.createUserProfile);
router.post('/club', profilesController.createClubProfile);
router.put('/user/:id', profilesController.updateUserProfile);
router.put('/club/:id', profilesController.updateClubProfile);
router.put('/:id/preferences', profilesController.updateUserPreferences);
router.delete('/:id', profilesController.deleteProfile);

module.exports = router;