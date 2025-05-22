import { PGlite } from '@electric-sql/pglite';
export const db = new PGlite();

export async function initializeDB() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      age INTEGER,
      gender TEXT
    );
  `);
}