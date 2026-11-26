const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");
function openDatabase(
  filename = process.env.DB_PATH ||
    path.join(__dirname, "../data/arena.sqlite"),
) {
  if (filename !== ":memory:")
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  );
  for (const name of fs
    .readdirSync(path.join(__dirname, "../db/migrations"))
    .sort()) {
    if (db.prepare("SELECT name FROM migrations WHERE name=?").get(name))
      continue;
    db.exec("BEGIN");
    try {
      db.exec(
        fs.readFileSync(path.join(__dirname, "../db/migrations", name), "utf8"),
      );
      db.prepare("INSERT INTO migrations(name) VALUES(?)").run(name);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
module.exports = { openDatabase };
