# Menu App API

Express API for processing reviews with text and rating data.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your OpenAI API key:

```bash
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
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

Process a list of reviews using AI to extract food items and sentiment.

**Request Body:**

```json
{
  "placeId": "restaurant-123",
  "reviews": [
    {
      "text": "The pizza was amazing! Best I've ever had.",
      "rating": 5
    },
    {
      "text": "Service was slow but the burger was decent",
      "rating": 3
    },
    {
      "text": "Great atmosphere and friendly staff",
      "rating": 4
    }
  ]
}
```

**Response:**

```json
[
  {
    "item": "pizza",
    "rating": 5
  },
  {
    "item": "burger",
    "rating": 3
  },
  {
    "rating": 4
  }
]
```

Note: The `item` key is only included if a food item is mentioned in the review. The `rating` is the AI's perceived sentiment from 1-5.

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

Each review is processed using OpenAI's GPT-4o-mini to extract:

- **item**: The food item mentioned in the review (only included if mentioned)
- **rating**: Perceived sentiment from 1-5 (1 = very negative, 5 = very positive)

The AI analyzes the review text and original rating to determine the sentiment and identify any specific food items mentioned.

## Environment Variables

- `PORT`: Server port (default: 3000)
- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Customization

To customize the review processing logic, edit `services/reviewService.js`. The `processReview` function uses the AI SDK to extract information from reviews.
