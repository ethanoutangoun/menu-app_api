const reviewService = require("../services/reviewService");
const storageService = require("../services/storageService");
const vectorizationService = require("../services/vectorizationService");

const processReviews = async (req, res, next) => {
  try {
    const { reviews, placeId, weighted = false } = req.body;

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

    // Process each review (using Promise.all for parallel processing)
    const processedResults = await Promise.all(
      reviews.map(async (review, index) => {
        try {
          // Validate individual review - check for 'text' and 'rating' keys
          if (!review.text || typeof review.text !== "string") {
            throw new Error(
              `Review at index ${index} is missing or has invalid text field`
            );
          }

          if (
            review.rating === undefined ||
            typeof review.rating !== "number"
          ) {
            throw new Error(
              `Review at index ${index} is missing or has invalid rating field`
            );
          }

          // Process the review with AI
          const processed = await reviewService.processReview(
            review,
            weighted,
            review.rating
          );

          // Return null if no item found (will be filtered out)
          return processed;
        } catch (error) {
          return {
            error: error.message,
            index: index,
          };
        }
      })
    );

    // Filter out null results and errors (reviews with no food item mentioned)
    const filteredResults = processedResults.filter(
      (result) => result !== null && !result.error
    );
    

    // Save processed reviews to file
    if (filteredResults.length > 0) {
      try {
        await storageService.saveProcessedReviews(placeId, filteredResults);
      } catch (error) {
        console.error("Error saving processed reviews:", error);
        // Continue even if saving fails
      }
    }

    // Vectorize and group similar items
    const menuData = await vectorizationService.processIntoMenuItems(
      filteredResults
    );

    console.log(menuData);

    res.json(menuData);
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
