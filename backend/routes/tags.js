const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');

router.get('/', tagsController.getAllTags);
router.get('/id/:id', tagsController.getTagById);
router.get('/name/:name', tagsController.getTagByName);
router.post('/', tagsController.createTag);
router.delete('/:id', tagsController.deleteTag);

module.exports = router;