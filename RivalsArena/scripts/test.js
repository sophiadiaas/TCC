// Expande os arquivos no próprio Node: também funciona no cmd.exe do Windows.
const { readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const files = readdirSync(path.join(__dirname, "../test"))
  .filter((name) => name.endsWith(".test.js"))
  .sort()
  .map((name) => path.join(__dirname, "../test", name));
if (!files.length) throw new Error("Nenhum arquivo de teste encontrado.");
const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
