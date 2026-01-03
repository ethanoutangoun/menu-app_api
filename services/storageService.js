/**
 * Service for storing and retrieving processed reviews
 */

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Hash placeId to create a filename-safe identifier
 */
function hashPlaceId(placeId) {
  return crypto.createHash("sha256").update(placeId).digest("hex");
}

/**
 * Save processed reviews to a JSON file
 */
async function saveProcessedReviews(placeId, processedReviews) {
  await ensureDataDir();
  const hash = hashPlaceId(placeId);
  const filePath = path.join(DATA_DIR, `${hash}.json`);

  const data = {
    placeId,
    hash,
    processedAt: new Date().toISOString(),
    reviews: processedReviews,
  };

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

/**
 * Load processed reviews from a JSON file
 */
async function loadProcessedReviews(placeId) {
  await ensureDataDir();
  const hash = hashPlaceId(placeId);
  const filePath = path.join(DATA_DIR, `${hash}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

module.exports = {
  saveProcessedReviews,
  loadProcessedReviews,
  hashPlaceId,
};

