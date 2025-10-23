const express = require('express');
const router = express.Router();
const clubCategoriesController = require('../controllers/clubCategoriesController');

router.get('/', clubCategoriesController.getAllClubCategories);
router.get('/id/:id', clubCategoriesController.getClubCategoryById);
router.get('/name/:name', clubCategoriesController.getClubCategoryByName);
router.post('/', clubCategoriesController.createClubCategory);
router.delete('/:id', clubCategoriesController.deleteClubCategory);

module.exports = router;