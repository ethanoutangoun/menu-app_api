const reviewService = require("../services/reviewService");

const processReviews = async (req, res, next) => {
  try {
    const { reviews, placeId } = req.body;

    // Validate input - require reviews and placeId
    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({
        error: "Invalid input: reviews must be an array",
      });
    }

    if (!placeId) {
      return res.status(400).json({
        error: "Invalid input: placeId is required",
      });
    }

    if (reviews.length === 0) {
      return res.status(400).json({
        error: "Invalid input: reviews array cannot be empty",
      });
    }

    // Process each review
    const processedResults = reviews.map((review, index) => {
      try {
        // Validate individual review - check for 'text' and 'rating' keys
        if (!review.text || typeof review.text !== "string") {
          throw new Error(
            `Review at index ${index} is missing or has invalid text field`
          );
        }

        if (review.rating === undefined || typeof review.rating !== "number") {
          throw new Error(
            `Review at index ${index} is missing or has invalid rating field`
          );
        }

        // Process the review (just returns the same object for now)
        const processed = reviewService.processReview(review);

        return processed;
      } catch (error) {
        return {
          error: error.message,
          index: index,
        };
      }
    });

    res.json(processedResults);
  } catch (error) {
    next(error);
  }
};

const getReviews = (req, res, next) => {
  try {
    res.json({
      message: "This endpoint is not implemented yet",
    });
  } catch (error) {
    next(error);
  }
};

const getStats = (req, res, next) => {
  try {
    res.json({
      message: "This endpoint is not implemented yet",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processReviews,
  getReviews,
  getStats,
};
