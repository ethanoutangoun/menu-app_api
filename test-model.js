/**
 * Test script for OpenAI model integration
 * Run with: node test-model.js
 */

require("dotenv").config();
const { openai } = require("@ai-sdk/openai");
const { generateObject } = require("ai");
const { z } = require("zod");

async function testModel() {
  console.log("Testing OpenAI model integration...\n");

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set in environment variables");
    console.log("\nPlease create a .env file with:");
    console.log("OPENAI_API_KEY=your_api_key_here\n");
    process.exit(1);
  }

  console.log("✅ OPENAI_API_KEY is set");
  console.log(`   Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 7)}...\n`);

  // Check openai function
  if (typeof openai !== "function") {
    console.error("❌ ERROR: openai is not a function");
    console.error("   Check if @ai-sdk/openai is properly installed");
    process.exit(1);
  }

  console.log("✅ openai function is available\n");

  // Test model initialization
  try {
    console.log("Testing model initialization...");
    const model = openai("gpt-4o-mini");
    
    if (!model) {
      console.error("❌ ERROR: Model is null/undefined");
      process.exit(1);
    }

    console.log("✅ Model initialized successfully");
    console.log(`   Model type: ${typeof model}\n`);
  } catch (error) {
    console.error("❌ ERROR initializing model:", error.message);
    console.error(error);
    process.exit(1);
  }

  // Test generateObject
  try {
    console.log("Testing generateObject with a simple review...");
    const testReview = {
      text: "The pizza was amazing! Best I've ever had.",
      rating: 5
    };

    console.log(`   Review text: "${testReview.text}"`);
    console.log(`   Review rating: ${testReview.rating}\n`);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `Analyze this restaurant review and extract:
1. The specific food item mentioned (e.g., "pizza", "burger", "pasta") - only if a specific food item is mentioned, otherwise return null
2. The perceived sentiment as a number from 1-5 (1 = very negative, 5 = very positive)

Review text: "${testReview.text}"

Extract the food item name if mentioned, and determine the sentiment rating based on the review text. Only return an object if a food item is mentioned.`,
      schema: z.object({
        item: z.string().nullable().describe("The food item mentioned in the review, or null if not mentioned"),
        rating: z.number().min(1).max(5).describe("Perceived sentiment from 1-5"),
      }),
    });

    console.log("✅ generateObject succeeded!");
    console.log("\nResult:");
    console.log(JSON.stringify(object, null, 2));
    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ ERROR in generateObject:");
    console.error("   Message:", error.message);
    console.error("   Stack:", error.stack);
    
    if (error.cause) {
      console.error("   Cause:", error.cause);
    }
    
    process.exit(1);
  }
}

// Run the test
testModel().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});

