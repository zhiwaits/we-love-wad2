const express = require('express');
const router = express.Router();
const eventCategoriesController = require('../controllers/eventCategoriesController');

router.get('/', eventCategoriesController.getAllEventCategories);
router.get('/:name', eventCategoriesController.getEventCategoryByName);
router.post('/', eventCategoriesController.createEventCategory);
router.delete('/:name', eventCategoriesController.deleteEventCategory);

module.exports = router;