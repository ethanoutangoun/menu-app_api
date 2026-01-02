const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// POST /api/reviews/process - Process a list of reviews
router.post('/process', reviewController.processReviews);

// GET /api/reviews - Get all processed reviews (if you want to store them)
router.get('/', reviewController.getReviews);

// GET /api/reviews/stats - Get statistics about processed reviews
router.get('/stats', reviewController.getStats);

module.exports = router;

