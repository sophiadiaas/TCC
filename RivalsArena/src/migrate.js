const { openDatabase, migrateDatabase } = require("./db");

async function main() {
  const db = openDatabase();
  try {
    await migrateDatabase(db);
    console.log("Migrations aplicadas.");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
