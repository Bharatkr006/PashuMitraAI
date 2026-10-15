import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Animal, HealthObservation } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function getDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const possiblePaths = [
    path.resolve(process.cwd(), "data/pashumitra.db"),
    path.resolve(process.cwd(), "pashumitra.db"),
    path.resolve(process.cwd(), "../data/pashumitra.db"),
    path.resolve(process.cwd(), "../pashumitra.db"),
    path.resolve(__dirname, "../../data/pashumitra.db"),
    path.resolve(__dirname, "../../pashumitra.db"),
    path.resolve(__dirname, "../../../pashumitra.db"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

interface DatabaseAdapter {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: any[]): { lastInsertRowid: number | bigint };
    all(...params: any[]): any[];
  };
}

let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (dbInstance) {
    return dbInstance;
  }
  const dbPath = getDbPath();

  try {
    // Official built-in node:sqlite (Node.js 22.5+, completely crash-free in modern V8)
    const { DatabaseSync } = require("node:sqlite");
    dbInstance = new DatabaseSync(dbPath);
  } catch {
    try {
      const BetterSqlite = require("better-sqlite3");
      dbInstance = new BetterSqlite(dbPath);
    } catch (e) {
      console.error("Could not initialize SQLite database:", e);
      throw e;
    }
  }

  initDatabase(dbInstance!);
  return dbInstance!;
}

export function initDatabase(db?: DatabaseAdapter): void {
  const conn = db || getDatabase();
  try {
    conn.exec("PRAGMA journal_mode = WAL;");
    conn.exec("PRAGMA busy_timeout = 5000;");
  } catch {}
  conn.exec(`
    CREATE TABLE IF NOT EXISTS animals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT,
      species TEXT NOT NULL,
      approximate_age TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      consent_given INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS health_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id INTEGER,
      observation_date TEXT,
      symptoms TEXT,
      query TEXT,
      response_summary TEXT,
      urgency_level TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (animal_id) REFERENCES animals(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_login_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function addAnimal(
  nickname: string,
  species: string,
  age = "",
  notes = ""
): number {
  const db = getDatabase();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const effectiveNickname = nickname || `${species}_${dateStr}`;

  const stmt = db.prepare(`
    INSERT INTO animals (nickname, species, approximate_age, notes, consent_given)
    VALUES (?, ?, ?, ?, 1)
  `);
  const result = stmt.run(effectiveNickname, species, age, notes);
  return Number(result.lastInsertRowid);
}

export function getAnimals(): Animal[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM animals ORDER BY created_at DESC");
  return stmt.all() as Animal[];
}

export function addObservation(
  animalId: number,
  symptoms: string,
  query: string,
  responseSummary: string,
  urgencyLevel: string,
  observationDate?: string | null
): number {
  const db = getDatabase();
  const dateStr = observationDate || new Date().toISOString().slice(0, 10);

  const stmt = db.prepare(`
    INSERT INTO health_observations
    (animal_id, observation_date, symptoms, query, response_summary, urgency_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(animalId, dateStr, symptoms, query, responseSummary, urgencyLevel);
  return Number(result.lastInsertRowid);
}

export function getAnimalHistory(animalId: number): HealthObservation[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM health_observations
    WHERE animal_id = ?
    ORDER BY observation_date DESC
  `);
  return stmt.all(animalId) as HealthObservation[];
}

export function deleteAnimal(animalId: number): boolean {
  const db = getDatabase();
  const delObs = db.prepare("DELETE FROM health_observations WHERE animal_id = ?");
  const delAnimal = db.prepare("DELETE FROM animals WHERE id = ?");
  
  delObs.run(animalId);
  delAnimal.run(animalId);
  return true;
}

export function getRecentObservations(limit = 10): HealthObservation[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT ho.*, a.nickname, a.species
    FROM health_observations ho
    JOIN animals a ON ho.animal_id = a.id
    ORDER BY ho.created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit) as HealthObservation[];
}
