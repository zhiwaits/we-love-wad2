const express = require('express');
const router = express.Router();
const profilesController = require('../controllers/profilesController');

router.get('/', profilesController.getAllProfiles);
router.get('/user', profilesController.getAllUserProfiles);
router.get('/club', profilesController.getAllClubProfiles);
router.get('/:id', profilesController.getProfileById);
router.post('/user', profilesController.createUserProfile);
router.put('/user/:id', profilesController.updateUserProfile);
router.put('/club/:id', profilesController.updateClubProfile);
router.delete('/:id', profilesController.deleteProfile);

module.exports = router;