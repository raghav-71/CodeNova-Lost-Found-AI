import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface DatabaseService {
  query<T = any>(sql: string, params?: any[]): T[];
  queryOne<T = any>(sql: string, params?: any[]): T | null;
  run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number | bigint };
  exec(sql: string): void;
  save(): void;
}

let dbInstance: SqlJsDatabase | null = null;
const dbDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'findit.sqlite');
const legacyDbPath = path.join(dbDir, 'codenova.sqlite');

export async function initDatabase(): Promise<DatabaseService> {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else if (fs.existsSync(legacyDbPath)) {
    const fileBuffer = fs.readFileSync(legacyDbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables
  createSchema(dbInstance);
  saveDatabase(dbInstance);

  return {
    query<T = any>(sql: string, params: any[] = []): T[] {
      if (!dbInstance) throw new Error('Database not initialized');
      const stmt = dbInstance.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      stmt.free();
      return results;
    },

    queryOne<T = any>(sql: string, params: any[] = []): T | null {
      if (!dbInstance) throw new Error('Database not initialized');
      const stmt = dbInstance.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      let result: T | null = null;
      if (stmt.step()) {
        result = stmt.getAsObject() as unknown as T;
      }
      stmt.free();
      return result;
    },

    run(sql: string, params: any[] = []) {
      if (!dbInstance) throw new Error('Database not initialized');
      dbInstance.run(sql, params);
      const changesRes = dbInstance.exec('SELECT changes() as count, last_insert_rowid() as id');
      let changes = 1;
      let lastInsertRowid = 0;
      if (changesRes.length > 0 && changesRes[0].values.length > 0) {
        changes = Number(changesRes[0].values[0][0]);
        lastInsertRowid = Number(changesRes[0].values[0][1]);
      }
      saveDatabase(dbInstance);
      return { changes, lastInsertRowid };
    },

    exec(sql: string) {
      if (!dbInstance) throw new Error('Database not initialized');
      dbInstance.exec(sql);
      saveDatabase(dbInstance);
    },

    save() {
      if (dbInstance) {
        saveDatabase(dbInstance);
      }
    }
  };
}

function saveDatabase(db: SqlJsDatabase) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

function createSchema(db: SqlJsDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      campus TEXT DEFAULT 'Central Campus',
      phone TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('LOST', 'FOUND')) NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      building_zone TEXT,
      latitude REAL,
      longitude REAL,
      date TEXT NOT NULL,
      time TEXT,
      status TEXT CHECK(status IN ('ACTIVE', 'MATCH_FOUND', 'CLAIM_PENDING', 'RESOLVED', 'CLOSED')) DEFAULT 'ACTIVE',
      primary_image TEXT,
      characteristics TEXT,
      contact_preference TEXT DEFAULT 'in_app',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_images (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS potential_matches (
      id TEXT PRIMARY KEY,
      lost_item_id TEXT NOT NULL,
      found_item_id TEXT NOT NULL,
      match_score INTEGER NOT NULL,
      match_reasons TEXT NOT NULL,
      matched_features TEXT NOT NULL,
      ai_evaluated INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,
      UNIQUE(lost_item_id, found_item_id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      claimant_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
      location_lost TEXT NOT NULL,
      date_lost TEXT NOT NULL,
      identifying_details TEXT NOT NULL,
      proof_notes TEXT,
      contact_share_consent INTEGER DEFAULT 1,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_potential_matches_lost ON potential_matches(lost_item_id);
    CREATE INDEX IF NOT EXISTS idx_potential_matches_found ON potential_matches(found_item_id);
    CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
    CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON claims(claimant_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  `);
}
