# Scoreboard API Module Specification

## Overview

This document specifies the API module for a real-time scoreboard system that displays the top 10 user scores with live updates. The module handles score updates based on server-validated answer submissions, ensuring that score calculations are performed entirely server-side to prevent manipulation.

Noted: I have made an assumption that the action(from the question) will be submiting the answer in order to get the points.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [WebSocket Events](#websocket-events)
4. [Data Models](#data-models)
5. [Authentication & Security](#authentication--security)
6. [Error Handling](#error-handling)
7. [Implementation Notes](#implementation-notes)
8. [Comments for Improvement](#comments-for-improvement)

---

## Architecture Overview

The module consists of three main components:

1. **REST API** - Handles answer submissions and validates correctness server-side
2. **WebSocket Server** - Broadcasts real-time scoreboard updates to connected clients
3. **Score Calculation Engine** - Determines and applies score increments based on validated answers (server-side only)

### Security Principle

**The client NEVER sends score values to the server.** All score calculations happen server-side based on answer validation. This eliminates IDOR vulnerabilities and score manipulation attacks.

### Flow Summary

```
User submits answer → Server validates answer → If correct, server calculates & applies score → Broadcast update
```

---

## API Endpoints

### 1. Submit Answer

Submits a user's answer for validation. If correct, the server automatically increments the user's score.

```
POST /api/v1/actions/submit
```

#### Headers

| Header        | Type   | Required | Description                               |
| ------------- | ------ | -------- | ----------------------------------------- |
| Authorization | string | Yes      | Bearer token for user authentication      |
| X-Request-ID  | string | No       | Unique request identifier for idempotency |

#### Request Body

```json
{
  "question_id": "string",
  "answer": "string | object",
  "submitted_at": "ISO 8601 datetime"
}
```

| Field        | Type          | Required | Description                                       |
| ------------ | ------------- | -------- | ------------------------------------------------- |
| question_id  | string        | Yes      | Unique identifier for the question being answered |
| answer       | string/object | Yes      | User's submitted answer                           |
| submitted_at | string        | Yes      | Client timestamp of submission (ISO 8601)         |

**Important:** The request contains NO score information. The server determines all scoring.

#### Response

**Success - Correct Answer (200 OK)**

```json
{
  "success": true,
  "data": {
    "question_id": "string",
    "is_correct": true,
    "points_earned": "integer",
    "new_total_score": "integer",
    "rank": "integer | null",
    "feedback": "string | null"
  }
}
```

**Success - Incorrect Answer (200 OK)**

```json
{
  "success": true,
  "data": {
    "question_id": "string",
    "is_correct": false,
    "points_earned": 0,
    "new_total_score": "integer",
    "rank": "integer | null",
    "feedback": "string | null"
  }
}
```

**Error (4xx/5xx)**

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

---

### 2. Get Question

Retrieves a question for the user to answer. The score value is stored server-side and never exposed to the client.

```
GET /api/v1/actions/question/{question_id}
```

#### Headers

| Header        | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| Authorization | string | Yes      | Bearer token for user authentication |

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "question_id": "string",
    "question_text": "string",
    "question_type": "multiple_choice | text | numeric",
    "options": ["array of options (if multiple choice)"],
    "difficulty": "easy | medium | hard",
    "time_limit_seconds": "integer | null",
    "expires_at": "ISO 8601 datetime"
  }
}
```

**Note:** The `points` value is intentionally NOT included in the response. Score values are kept server-side only.

---

### 3. Get Leaderboard

Retrieves the current top 10 scores.

```
GET /api/v1/scores/leaderboard
```

#### Headers

| Header        | Type   | Required | Description                         |
| ------------- | ------ | -------- | ----------------------------------- |
| Authorization | string | No       | Bearer token (optional for viewing) |

#### Query Parameters

| Parameter | Type    | Default | Description                 |
| --------- | ------- | ------- | --------------------------- |
| limit     | integer | 10      | Number of entries (max 100) |

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "string",
        "username": "string",
        "score": "integer",
        "updated_at": "ISO 8601 datetime"
      }
    ],
    "last_updated": "ISO 8601 datetime"
  }
}
```

---

### 4. Get User Score

Retrieves the authenticated user's current score and rank.

```
GET /api/v1/scores/me
```

#### Headers

| Header        | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| Authorization | string | Yes      | Bearer token for user authentication |

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": "string",
    "username": "string",
    "score": "integer",
    "rank": "integer",
    "questions_answered": "integer",
    "correct_answers": "integer"
  }
}
```

---

## WebSocket Events

### Connection

```
WSS /ws/scoreboard
```

#### Connection Parameters

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| token     | string | No       | Auth token for authenticated features |

### Server-to-Client Events

#### `leaderboard:update`

Broadcasted when the top 10 leaderboard changes.

```json
{
  "event": "leaderboard:update",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "string",
        "username": "string",
        "score": "integer"
      }
    ],
    "changed_positions": [1, 3, 5],
    "timestamp": "ISO 8601 datetime"
  }
}
```

#### `score:personal_update`

Sent to authenticated users when their own score changes.

```json
{
  "event": "score:personal_update",
  "data": {
    "new_score": "integer",
    "points_earned": "integer",
    "rank": "integer | null",
    "timestamp": "ISO 8601 datetime"
  }
}
```

### Client-to-Server Events

#### `subscribe:leaderboard`

Subscribe to leaderboard updates.

```json
{
  "event": "subscribe:leaderboard"
}
```

#### `ping`

Keep-alive message.

```json
{
  "event": "ping"
}
```

---

## Data Models

### Question

```
Question {
  question_id: string (PK)
  question_text: string
  question_type: enum (multiple_choice, text, numeric)
  correct_answer: string (encrypted/hashed)
  options: json | null
  points: integer                    // Server-side only, NEVER exposed to client
  difficulty: enum (easy, medium, hard)
  time_limit_seconds: integer | null
  is_active: boolean (default: true)
  created_at: datetime
  updated_at: datetime
}
```

### User Score Record

```
UserScore {
  user_id: string (PK)
  username: string
  score: integer (default: 0, indexed, descending)
  questions_answered: integer (default: 0)
  correct_answers: integer (default: 0)
  updated_at: datetime
  created_at: datetime
}
```

### User Answer Record

```
UserAnswer {
  answer_id: string (PK)
  user_id: string (FK, indexed)
  question_id: string (FK, indexed)
  submitted_answer: string
  is_correct: boolean
  points_awarded: integer           // Calculated and stored server-side
  answered_at: datetime (indexed)

  UNIQUE(user_id, question_id)      // Prevent duplicate submissions
}
```

### Score Update Log (Audit Trail)

```
ScoreUpdateLog {
  log_id: string (PK)
  user_id: string (FK, indexed)
  question_id: string (FK)
  answer_id: string (FK)
  points_awarded: integer
  score_before: integer
  score_after: integer
  ip_address: string
  user_agent: string
  created_at: datetime (indexed)
}
```

---

## Authentication & Security

### 1. User Authentication

All answer submissions require a valid JWT bearer token containing:

```json
{
  "sub": "user_id",
  "exp": "expiration_timestamp",
  "iat": "issued_at_timestamp",
  "jti": "unique_token_id"
}
```

### 2. Server-Side Score Calculation (Core Security)

**This is the primary defense against score manipulation:**

| What Client Sends       | What Server Does                             |
| ----------------------- | -------------------------------------------- |
| `question_id`           | Looks up question from database              |
| `answer`                | Compares against stored correct answer       |
| _(nothing about score)_ | Retrieves `points` value from Question table |
| _(nothing about score)_ | Calculates and applies score increment       |

**The client has NO influence over score values.** Even if a malicious user intercepts and modifies the request, there is no score field to manipulate.

### 3. Duplicate Submission Prevention

- **Database constraint**: `UNIQUE(user_id, question_id)` prevents answering the same question twice
- **Idempotency**: `X-Request-ID` header prevents duplicate processing from network retries
- **Server check**: Before processing, verify the user hasn't already answered this question

### 4. Answer Validation Rules

```
validateAnswer(user_id, question_id, submitted_answer):
  1. Check question exists and is active
  2. Check user hasn't already answered this question
  3. Check question hasn't expired (if time-limited)
  4. Compare submitted_answer with correct_answer
  5. If correct: award points (from Question.points)
  6. Log the attempt regardless of correctness
```

### 5. Rate Limiting

| Endpoint                 | Limit         | Window   |
| ------------------------ | ------------- | -------- |
| POST /actions/submit     | 30 requests   | 1 minute |
| GET /actions/question/\* | 60 requests   | 1 minute |
| GET /scores/leaderboard  | 120 requests  | 1 minute |
| WebSocket connections    | 5 connections | per user |

### 6. Additional Security Measures

- **No score exposure**: Question endpoints never reveal point values
- **Answer hashing**: Correct answers stored hashed when possible (for text answers)
- **Timing attack prevention**: Use constant-time comparison for answer validation
- **Audit logging**: All score changes logged with full context for forensic analysis

---

## Error Handling

### Error Codes

| Code                  | HTTP Status | Description                                |
| --------------------- | ----------- | ------------------------------------------ |
| AUTH_REQUIRED         | 401         | Missing or invalid authentication token    |
| AUTH_EXPIRED          | 401         | Authentication token has expired           |
| QUESTION_NOT_FOUND    | 404         | Question does not exist                    |
| QUESTION_EXPIRED      | 400         | Question time limit has passed             |
| QUESTION_INACTIVE     | 400         | Question is no longer active               |
| ALREADY_ANSWERED      | 409         | User has already answered this question    |
| INVALID_ANSWER_FORMAT | 400         | Answer format doesn't match question type  |
| RATE_LIMIT_EXCEEDED   | 429         | Too many requests                          |
| DUPLICATE_REQUEST     | 409         | Request with this ID was already processed |
| INTERNAL_ERROR        | 500         | Unexpected server error                    |

---

## Implementation Notes

### Database Recommendations

- Use Redis sorted sets for the leaderboard cache (fast O(log N) rank queries)
- Use PostgreSQL for persistent storage with proper indexing
- Implement write-through caching: update Redis and PostgreSQL atomically
- Use database transactions to ensure score consistency

### WebSocket Recommendations

- Use Redis Pub/Sub for broadcasting across multiple server instances
- Implement connection heartbeat (30-second intervals)
- Batch leaderboard updates (debounce 100ms) to prevent excessive broadcasts

### Scalability Considerations

- Leaderboard reads should be served from cache (Redis)
- Answer validation can be synchronous for low-medium traffic
- For high traffic: use message queue for score aggregation with eventual consistency

---

## Security Summary

| Attack Vector                 | Mitigation                                     |
| ----------------------------- | ---------------------------------------------- |
| IDOR (modifying score values) | **Eliminated** - Client never sends score data |
| Duplicate submission          | Database unique constraint + idempotency check |
| Answering expired questions   | Server-side time validation                    |
| Brute-forcing answers         | Rate limiting + account lockout                |
| Replay attacks                | Request ID idempotency + timestamp validation  |
| Score manipulation via API    | All score logic is server-side only            |

---
