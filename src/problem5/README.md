# Book Management API

A simple REST API for managing books built with Express.js and TypeScript.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run in development mode:

```bash
npm run dev
```

3. For production:

```bash
npm run build
npm start
```

The server runs on `http://localhost:3000` by default. Set `PORT` env variable to change it.

## API Documentation

Swagger UI is available at `http://localhost:3000/api-docs` when the server is running.

## Database

Uses SQLite for storage. The database file is created automatically at `data/books.db` on first run.

## API Endpoints

### Books

| Method | Endpoint       | Description         |
| ------ | -------------- | ------------------- |
| GET    | /api/books     | List all books      |
| GET    | /api/books/:id | Get a specific book |
| POST   | /api/books     | Create a new book   |
| PUT    | /api/books/:id | Update a book       |
| DELETE | /api/books/:id | Delete a book       |

### Filtering

The list endpoint supports query parameters:

- `author` - filter by author name (partial match)
- `year` - filter by publication year (exact match)

Example: `GET /api/books?author=tolkien&year=1937`
