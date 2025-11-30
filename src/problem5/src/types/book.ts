export interface Book {
  id: number;
  title: string;
  author: string;
  published_year: number | null;
  genre: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookInput {
  title: string;
  author: string;
  published_year?: number;
  genre?: string;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  published_year?: number;
  genre?: string;
}

export type BookFilters = {
  author?: string;
  genre?: string;
  year?: number;
}
