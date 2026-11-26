const { openDatabase } = require("./db");
const { seed } = require("./seed");
const { createApp } = require("./app");
async function main() {
  const db = openDatabase();
  try {
    await db.query("SELECT 1");
    await seed(db);
    const port = Number(process.env.PORT) || 3000;
    const server = createApp(db).listen(port, () =>
      console.log(
        `Rivals Arena: http://localhost:${port} | API: http://localhost:${port}/docs`,
      ),
    );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () =>
        server.close(async () => {
          await db.close();
          process.exit(0);
        }),
      );
  } catch (error) {
    await db.close();
    throw error;
  }
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
