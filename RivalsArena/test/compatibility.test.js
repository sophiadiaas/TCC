const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

test("inicialização compatível: .env opcional e configurações sem flags recentes do Node", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arena-env-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const loader = path.resolve(__dirname, "../src/env.js");
  const env = { ...process.env };
  delete env.ARENA_TEST_SETTING;
  const run = () =>
    spawnSync(
      process.execPath,
      [
        "-r",
        loader,
        "-e",
        "console.log(JSON.stringify({value:process.env.ARENA_TEST_SETTING||null}))",
      ],
      { cwd: dir, env, encoding: "utf8" },
    );
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { value: null });
  fs.writeFileSync(
    path.join(dir, ".env"),
    'ARENA_TEST_SETTING="valor local"\n',
  );
  result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { value: "valor local" });
  env.ARENA_TEST_SETTING = "valor do ambiente";
  result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { value: "valor do ambiente" });
  t.diagnostic(
    "Runtime verificado: " +
      process.version +
      " (" +
      process.platform +
      "/" +
      process.arch +
      ")",
  );
});
