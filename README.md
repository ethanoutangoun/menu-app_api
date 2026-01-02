# Menu App API

Express API for processing reviews with text and rating data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, defaults to port 3000):
```bash
cp .env.example .env
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### POST /api/reviews/process
Process a list of reviews.

**Request Body:**
```json
{
  "reviews": [
    {
      "text": "Great food and excellent service!",
      "rating": 5,
      "author": "John Doe",
      "date": "2024-01-15"
    },
    {
      "text": "Not bad, but could be better",
      "rating": 3
    }
  ]
}
```

**Response:**
```json
{
  "message": "Reviews processed successfully",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "original": { ... },
      "processed": {
        "text": "...",
        "rating": 5,
        "wordCount": 5,
        "characterCount": 35,
        "sentiment": "positive",
        "category": "excellent",
        "processedAt": "2024-01-15T10:30:00.000Z",
        "author": "John Doe",
        "date": "2024-01-15"
      },
      "index": 0,
      "success": true
    }
  ]
}
```

### GET /api/reviews
Get all processed reviews.

**Response:**
```json
{
  "count": 10,
  "reviews": [ ... ]
}
```

### GET /api/reviews/stats
Get statistics about processed reviews.

**Response:**
```json
{
  "total": 10,
  "ratings": {
    "average": 4.2,
    "min": 1,
    "max": 5
  },
  "sentimentDistribution": {
    "positive": 7,
    "negative": 2,
    "neutral": 1
  },
  "categoryDistribution": {
    "excellent": 5,
    "very_good": 2,
    "good": 2,
    "fair": 1
  }
}
```

### GET /health
Health check endpoint.

## Review Processing

Each review is processed to extract:
- Word count
- Character count
- Sentiment analysis (positive/negative/neutral)
- Category (excellent/very_good/good/fair/poor)
- All original fields are preserved

## Customization

To customize the review processing logic, edit `services/reviewService.js`. The `processReview` function is where you can add your own processing logic.

