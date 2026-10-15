import { getDatabase } from "./health-records.js";
import { User } from "../types.js";

function formatDefaultName(email: string): string {
  const localPart = email.split("@")[0] || "User";
  // Convert dots/underscores to spaces and capitalize each word
  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ") || "User";
}

export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const stmt = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE");
  const rows = stmt.all(normalizedEmail) as User[];
  return rows.length > 0 ? rows[0] : null;
}

export function getUserById(id: number): User | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const rows = stmt.all(id) as User[];
  return rows.length > 0 ? rows[0] : null;
}

export function createUser(email: string, name?: string): User {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const finalName = name && name.trim() ? name.trim() : formatDefaultName(normalizedEmail);
  const now = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO users (email, name, created_at, last_login_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = insertStmt.run(normalizedEmail, finalName, now, now);
  const id = Number(result.lastInsertRowid);

  const created = getUserById(id);
  if (!created) {
    return {
      id,
      email: normalizedEmail,
      name: finalName,
      created_at: now,
      last_login_at: now,
    };
  }
  return created;
}

export function updateLastLogin(id: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?");
  stmt.run(now, id);
}

export function findOrCreateUser(
  email: string,
  name?: string
): { user: User; isNewUser: boolean } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = getUserByEmail(normalizedEmail);

  if (existing) {
    updateLastLogin(existing.id);
    // If name was provided and existing didn't have one or user wants to update
    if (name && name.trim() && name.trim() !== existing.name) {
      const db = getDatabase();
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), existing.id);
      existing.name = name.trim();
    }
    existing.last_login_at = new Date().toISOString();
    return { user: existing, isNewUser: false };
  }

  const newUser = createUser(normalizedEmail, name);
  return { user: newUser, isNewUser: true };
}
