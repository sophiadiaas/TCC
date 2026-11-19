// Pré-carregamento compartilhado pelos comandos npm; compatível com Node 20.
const fs = require("node:fs");
const path = require("node:path");
const filename = path.resolve(process.cwd(), ".env");
if (fs.existsSync(filename)) {
  const result = require("dotenv").config({ path: filename, quiet: true });
  if (result.error) throw result.error;
}
