const { execFileSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");
function walk(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (p.endsWith(".js"))
      execFileSync(process.execPath, ["--check", p], { stdio: "inherit" });
  }
}
for (const dir of ["src", "public/js", "scripts", "test"]) walk(dir);
console.log("Sintaxe de todos os arquivos JavaScript válida.");
