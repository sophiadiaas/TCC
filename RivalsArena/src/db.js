const { AsyncLocalStorage } = require("node:async_hooks");
const fs = require("node:fs");
const path = require("node:path");
const { Pool, types } = require("pg");

const transactions = new AsyncLocalStorage();
types.setTypeParser(20, Number);

function openTestDatabase(filename) {
  const Database = require("better-sqlite3");
  if (filename !== ":memory:")
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  const client = new Database(filename);
  client.exec("PRAGMA foreign_keys=ON");
  client.exec(
    fs.readFileSync(path.join(__dirname, "../db/test-schema.sql"), "utf8"),
  );
  return {
    query(sql, values = []) {
      const statement = client.prepare(sql);
      if (statement.reader || /\bRETURNING\b/i.test(sql)) {
        const rows = statement.all(...values);
        return { rows, rowCount: rows.length };
      }
      const result = statement.run(...values);
      return { rows: [], rowCount: result.changes };
    },
    async transaction(callback) {
      client.exec("BEGIN");
      try {
        const value = await callback();
        client.exec("COMMIT");
        return value;
      } catch (error) {
        client.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      client.close();
    },
    prepare: (...args) => client.prepare(...args),
    exec: (...args) => client.exec(...args),
  };
}

function openDatabase(filename) {
  if (filename !== undefined) return openTestDatabase(filename);

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_URL;
  if (!connectionString || !/^postgres(?:ql)?:\/\//i.test(connectionString))
    throw new Error(
      "Configure DATABASE_URL com a string de conexão PostgreSQL do Supabase.",
    );

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true },
    max: Number(process.env.DB_POOL_MAX) || 10,
  });
  return {
    pool,
    query(sql, values = []) {
      const client = transactions.getStore() || pool;
      let parameter = 0;
      const parameterizedSql = sql.replace(/\?/g, () => `$${++parameter}`);
      return client.query(parameterizedSql, values);
    },
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await transactions.run(client, callback);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function migrateDatabase(db) {
  const client = await db.pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    );
    const directory = path.join(__dirname, "../db/migrations");
    for (const name of fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      const { rows } = await client.query(
        "SELECT name FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (rows.length) continue;

      await client.query("BEGIN");
      try {
        await client.query(fs.readFileSync(path.join(directory, name), "utf8"));
        await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
          name,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { openDatabase, migrateDatabase };
