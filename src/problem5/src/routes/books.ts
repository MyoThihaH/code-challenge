import { Router, Request, Response } from 'express';
import db from '../db/database';
import { Book, CreateBookInput, UpdateBookInput, BookFilters } from '../types/book';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         published_year:
 *           type: integer
 *         genre:
 *           type: string
 *         created_at:
 *           type: string
 *         updated_at:
 *           type: string
 *     CreateBook:
 *       type: object
 *       required:
 *         - title
 *         - author
 *       properties:
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         published_year:
 *           type: integer
 *         genre:
 *           type: string
 *     UpdateBook:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         published_year:
 *           type: integer
 *         genre:
 *           type: string
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 */
router.get('/', (req: Request, res: Response) => {
  const filters = req.query as BookFilters;

  let sql = 'SELECT * FROM books WHERE 1=1';
  const params: any[] = [];

  if (filters.author) {
    sql += ' AND author LIKE ?';
    params.push(`%${filters.author}%`);
  }
  if (filters.genre) {
    sql += ' AND genre LIKE ?';
    params.push('%' + filters.genre + '%');
  }
  if (filters.year) {
    sql += ' AND published_year = ?';
    params.push(Number(filters.year));
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const books = db.prepare(sql).all(...params);
    res.json(books);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Book found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Not found
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBook'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Validation error
 */
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateBookInput;

  if (!body.title || !body.author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO books (title, author, published_year, genre) VALUES (?, ?, ?, ?)'
    ).run(body.title, body.author, body.published_year ?? null, body.genre ?? null);

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(book);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Update book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBook'
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body as UpdateBookInput;

  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const setClauses: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    setClauses.push('title = ?');
    values.push(data.title);
  }
  if (data.author !== undefined) {
    setClauses.push('author = ?');
    values.push(data.author);
  }
  if (data.published_year !== undefined) {
    setClauses.push('published_year = ?');
    values.push(data.published_year);
  }
  if (data.genre !== undefined) {
    setClauses.push('genre = ?');
    values.push(data.genre);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  try {
    db.prepare(`UPDATE books SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  try {
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

export default router;
