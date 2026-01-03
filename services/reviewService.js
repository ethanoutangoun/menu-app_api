/**
 * Service for processing individual reviews using AI
 */

// Ensure dotenv is loaded (in case service is loaded before server.js)
if (!process.env.OPENAI_API_KEY) {
  require("dotenv").config();
}

const { openai } = require("@ai-sdk/openai");
const { generateObject } = require("ai");
const { z } = require("zod");

// Validate openai function is available
if (typeof openai !== "function") {
  throw new Error("Failed to import openai from @ai-sdk/openai");
}

const processReview = async (review, weighted = false, userRating = null) => {
  try {
    // Validate API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please set it in your .env file"
      );
    }

    // Initialize the model
    const model = openai("gpt-4.1-mini");

    if (!model) {
      throw new Error("Failed to create OpenAI model instance");
    }

    const { object } = await generateObject({
      model: model,
      prompt: `Analyze this restaurant review and extract:
1. The specific food item mentioned (e.g., "pizza", "burger", "pasta") - only if a specific food item is mentioned, otherwise return null
2. The perceived sentiment as a number from 1-5 (1 = very negative, 5 = very positive)

Review text: "${review.text}"

Extract the food item name if mentioned, and determine the sentiment rating based on the review text. Only return an object if a food item is mentioned.`,
      schema: z.object({
        item: z
          .string()
          .nullable()
          .describe(
            "The food item mentioned in the review, or null if not mentioned"
          ),
        rating: z
          .number()
          .min(1)
          .max(5)
          .describe("Perceived sentiment from 1-5"),
      }),
    });

    // Only return if item exists
    if (object && object.item) {
      let finalRating = object.rating;

      // If weighted is true, combine user rating with AI sentiment rating
      if (weighted && userRating !== null && typeof userRating === "number") {
        // Calculate weighted average (simple average for now, can be adjusted)
        finalRating = (userRating + object.rating) / 2;
        // Round to 1 decimal place
        finalRating = Math.round(finalRating * 10) / 10;
      }

      return {
        item: object.item,
        rating: finalRating,
      };
    }

    // Return null if no item found
    return null;
  } catch (error) {
    console.error("Error processing review with AI:", error);
    // If AI fails to find an item, return null instead of throwing
    if (error.message.includes("item") || error.message.includes("required")) {
      return null;
    }
    throw new Error(`Failed to process review: ${error.message}`);
  }
};

module.exports = {
  processReview,
};
